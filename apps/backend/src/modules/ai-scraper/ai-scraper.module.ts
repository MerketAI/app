import { Module } from '@nestjs/common';
import { AiScraperController } from './ai-scraper.controller';
import { AiScraperService } from './ai-scraper.service';
import { OrchestratorService } from './orchestrator.service';
import { MergerService } from './merger.service';
import { PerplexityProvider } from './providers/perplexity.provider';
import { SerperClaudeProvider } from './providers/serper-claude.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { FirecrawlClaudeProvider } from './providers/firecrawl-claude.provider';
import { CredentialsModule } from '../credentials/credentials.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [CredentialsModule, PrismaModule],
  controllers: [AiScraperController],
  providers: [
    AiScraperService,
    OrchestratorService,
    MergerService,
    PerplexityProvider,
    SerperClaudeProvider,
    OpenAIProvider,
    FirecrawlClaudeProvider,
  ],
  exports: [AiScraperService],
})
export class AiScraperModule {}
