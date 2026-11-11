import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { PartnerService } from './partner.service';

/**
 * Records every request that authenticated as a partner app. Requests from the
 * dashboard (JWT) are ignored - `request.partnerApp` is only set by the partner guards.
 */
@Injectable()
export class PartnerLoggingInterceptor implements NestInterceptor {
  constructor(private partnerService: PartnerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const request = http.getRequest();
    const startedAt = Date.now();

    const write = (statusCode: number, errorMessage?: string) => {
      if (!request.partnerApp?.id) return;
      void this.partnerService.logRequest({
        appId: request.partnerApp.id,
        appUid: request.appUid ?? null,
        userId: request.user?.id ?? null,
        method: request.method,
        path: request.route?.path ?? request.url?.split('?')[0] ?? request.url,
        statusCode,
        durationMs: Date.now() - startedAt,
        ipAddress: request.ip,
        userAgent: request.headers?.['user-agent'],
        errorMessage,
      });
    };

    return next.handle().pipe(
      tap(() => write(http.getResponse().statusCode ?? 200)),
      catchError((error) => {
        const status =
          error instanceof HttpException ? error.getStatus() : 500;
        write(status, (error as Error)?.message);
        return throwError(() => error);
      }),
    );
  }
}
