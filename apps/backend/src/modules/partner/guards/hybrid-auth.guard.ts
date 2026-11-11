import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { PartnerService, AuthenticatedApp } from '../partner.service';
import { REQUIRED_SCOPES_KEY } from '../decorators/require-scopes.decorator';
import {
  readAppCredentials,
  hasAppCredentials,
} from './partner-app.guard';

/**
 * Accepts either authentication style on the same route:
 *
 *   Dashboard  Authorization: Bearer <jwt>
 *   Partner    X-App-Key + X-App-Secret + X-App-Uid
 *
 * Both paths end with `request.user.id` set to an internal user id, so
 * controllers using `@CurrentUser('id')` work unchanged either way.
 */
@Injectable()
export class HybridAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly partnerService: PartnerService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();

    if (hasAppCredentials(request)) {
      return this.authenticateAsPartner(context, request);
    }

    return (await super.canActivate(context)) as boolean;
  }

  private async authenticateAsPartner(
    context: ExecutionContext,
    request: any,
  ): Promise<boolean> {
    const { appKey, appSecret, appUid, email, name } =
      readAppCredentials(request);

    if (!appSecret) {
      throw new UnauthorizedException(
        'X-App-Key was sent without X-App-Secret.',
      );
    }
    if (!appUid) {
      throw new UnauthorizedException(
        'X-App-Uid is required. It identifies which of your subscribers this request is for.',
      );
    }

    const app = await this.partnerService.authenticateApp(
      appKey as string,
      appSecret,
      this.clientIp(request),
    );

    this.enforceScopes(context, app);

    const subscriber = await this.partnerService.resolveSubscriber(
      app.id,
      appUid,
      { email, name },
    );

    // NB: `request.app` is reserved by Express for the application instance;
    // overwriting it breaks req.app.get(...) inside Express internals.
    request.partnerApp = app;
    request.appUid = subscriber.appUid;
    request.user = {
      id: subscriber.userId,
      role: 'USER',
      authVia: 'PARTNER_APP',
      appId: app.id,
      appKey: app.appKey,
      appUid: subscriber.appUid,
    };

    return true;
  }

  private enforceScopes(context: ExecutionContext, app: AuthenticatedApp) {
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

  private clientIp(request: any): string | undefined {
    const forwarded = request.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return request.ip || request.connection?.remoteAddress;
  }
}
