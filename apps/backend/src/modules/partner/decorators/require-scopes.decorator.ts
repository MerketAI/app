import { SetMetadata } from '@nestjs/common';

export const REQUIRED_SCOPES_KEY = 'requiredScopes';

/**
 * Declares the partner scopes a route needs. Ignored for dashboard (JWT)
 * callers, which are already scoped to the signed-in user.
 */
export const RequireScopes = (...scopes: string[]) =>
  SetMetadata(REQUIRED_SCOPES_KEY, scopes);
