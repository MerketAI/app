import { Global, Module } from '@nestjs/common';
import { PartnerService } from './partner.service';
import { PartnerController } from './partner.controller';
import { PartnerAdminController } from './partner-admin.controller';
import { PartnerAppGuard } from './guards/partner-app.guard';
import { HybridAuthGuard } from './guards/hybrid-auth.guard';
import { PartnerLoggingInterceptor } from './partner-logging.interceptor';

/**
 * Global so that every feature module can use HybridAuthGuard without having to
 * import this module explicitly.
 */
@Global()
@Module({
  controllers: [PartnerController, PartnerAdminController],
  providers: [
    PartnerService,
    PartnerAppGuard,
    HybridAuthGuard,
    PartnerLoggingInterceptor,
  ],
  exports: [
    PartnerService,
    PartnerAppGuard,
    HybridAuthGuard,
    PartnerLoggingInterceptor,
  ],
})
export class PartnerModule {}
