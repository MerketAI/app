import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PartnerService, AuthenticatedApp } from '../partner.service';
import { REQUIRED_SCOPES_KEY } from '../decorators/require-scopes.decorator';

export const APP_KEY_HEADER = 'x-app-key';
export const APP_SECRET_HEADER = 'x-app-secret';
export const APP_UID_HEADER = 'x-app-uid';
export const APP_USER_EMAIL_HEADER = 'x-app-user-email';
export const APP_USER_NAME_HEADER = 'x-app-user-name';

export interface PartnerRequestContext {
  app: AuthenticatedApp;
  appUid?: string;
}

/** Fixed-window counter, keyed by app id. Resets every 60s. */
class RateLimiter {
  private windows = new Map<string, { count: number; resetAt: number }>();

  consume(key: string, limitPerMin: number): boolean {
    const now = Date.now();
    const entry = this.windows.get(key);

    if (!entry || entry.resetAt <= now) {
      this.windows.set(key, { count: 1, resetAt: now + 60_000 });
      return true;
    }
    if (entry.count >= limitPerMin) return false;

    entry.count += 1;
    return true;
  }

  /** Drops expired windows so the map cannot grow without bound. */
  sweep() {
    const now = Date.now();
    for (const [key, entry] of this.windows) {
      if (entry.resetAt <= now) this.windows.delete(key);
    }
  }
}

const rateLimiter = new RateLimiter();
const sweepTimer = setInterval(() => rateLimiter.sweep(), 120_000);
// Do not hold the event loop open on shutdown.
if (typeof sweepTimer.unref === 'function') sweepTimer.unref();

export function readAppCredentials(request: any) {
  const headers = request.headers || {};
  return {
    appKey: headers[APP_KEY_HEADER] as string | undefined,
    appSecret: headers[APP_SECRET_HEADER] as string | undefined,
    appUid: headers[APP_UID_HEADER] as string | undefined,
    email: headers[APP_USER_EMAIL_HEADER] as string | undefined,
    name: headers[APP_USER_NAME_HEADER] as string | undefined,
  };
}

export function hasAppCredentials(request: any): boolean {
  const headers = request.headers || {};
  return Boolean(headers[APP_KEY_HEADER]);
}

/**
 * Authenticates the calling partner platform and attaches `request.partnerApp`.
 * Use for partner-administrative routes that act on the app itself rather than
 * on one of its subscribers - those do not need an APP_UID.
 */
@Injectable()
export class PartnerAppGuard implements CanActivate {
  constructor(
    protected readonly partnerService: PartnerService,
    protected readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { appKey, appSecret } = readAppCredentials(request);

    if (!appKey || !appSecret) {
      throw new UnauthorizedException(
        'Missing credentials. Send X-App-Key and X-App-Secret headers.',
      );
    }

    const app = await this.partnerService.authenticateApp(
      appKey,
      appSecret,
      this.clientIp(request),
    );

    this.enforceRateLimit(app);
    this.enforceScopes(context, app);

    // NB: `request.app` is reserved by Express for the application instance.
    request.partnerApp = app;
    return true;
  }

  protected enforceRateLimit(app: AuthenticatedApp) {
    if (!rateLimiter.consume(app.id, app.rateLimitPerMin)) {
      throw new HttpException(
        `Rate limit exceeded (${app.rateLimitPerMin} requests/minute)`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  protected enforceScopes(context: ExecutionContext, app: AuthenticatedApp) {
    const required = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_SCOPES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return;
    if (app.scopes.includes('*')) return;

    const missing = required.filter((s) => !app.scopes.includes(s));
    if (missing.length > 0) {
      throw new HttpException(
        `Application is not authorized for scope(s): ${missing.join(', ')}`,
        HttpStatus.FORBIDDEN,
      );
    }
  }

  protected clientIp(request: any): string | undefined {
    const forwarded = request.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return request.ip || request.connection?.remoteAddress;
  }
}
