import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { HybridAuthGuard } from '../partner/guards/hybrid-auth.guard';
import { AgentService } from './agent.service';

class AgentChatDto {
  @IsString()
  @MaxLength(4000)
  message: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];
}

@ApiTags('Marketing assistant')
@ApiBearerAuth()
@Controller({ path: 'agent', version: '1' })
@UseGuards(HybridAuthGuard)
export class AgentController {
  constructor(private agent: AgentService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send the assistant a message; it may save drafts, never publishes' })
  chat(@CurrentUser('id') userId: string, @Body() dto: AgentChatDto) {
    return this.agent.chat(userId, dto);
  }

  @Get('conversations')
  list(@CurrentUser('id') userId: string) {
    return this.agent.listConversations(userId);
  }

  @Get('conversations/:id')
  get(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.agent.getConversation(userId, id);
  }
}
