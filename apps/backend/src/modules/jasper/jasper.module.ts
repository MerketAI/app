import { Module } from '@nestjs/common';
import { JasperService } from './jasper.service';

@Module({
  providers: [JasperService],
  exports: [JasperService],
})
export class JasperModule {}
