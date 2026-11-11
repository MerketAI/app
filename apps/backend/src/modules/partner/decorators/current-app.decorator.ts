import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedApp } from '../partner.service';

/** The partner app behind the current request, as set by the partner guards. */
export const CurrentApp = createParamDecorator(
  (data: keyof AuthenticatedApp | undefined, ctx: ExecutionContext) => {
    const app = ctx.switchToHttp().getRequest().partnerApp as
      | AuthenticatedApp
      | undefined;
    if (!app) return null;
    return data ? app[data] : app;
  },
);
