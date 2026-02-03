import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('workspace')
@Controller({ path: 'workspace', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkspaceController {
  constructor(private workspaceService: WorkspaceService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user workspace' })
  @ApiResponse({ status: 200, description: 'Workspace found' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async getWorkspace(@CurrentUser('id') userId: string) {
    const workspace = await this.workspaceService.getWorkspace(userId);
    return { workspace };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new workspace' })
  @ApiResponse({ status: 201, description: 'Workspace created successfully' })
  @ApiResponse({ status: 409, description: 'User already has a workspace' })
  async createWorkspace(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWorkspaceDto,
  ) {
    const workspace = await this.workspaceService.createWorkspace(userId, dto);
    return { workspace };
  }

  @Put()
  @ApiOperation({ summary: 'Update workspace settings' })
  @ApiResponse({ status: 200, description: 'Workspace updated successfully' })
  async updateWorkspace(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    const workspace = await this.workspaceService.updateWorkspace(userId, dto);
    return { workspace };
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete workspace and all content' })
  @ApiResponse({ status: 204, description: 'Workspace deleted successfully' })
  async deleteWorkspace(@CurrentUser('id') userId: string) {
    await this.workspaceService.deleteWorkspace(userId);
  }

  @Get('check-slug/:slug')
  @ApiOperation({ summary: 'Check if a slug is available' })
  @ApiResponse({ status: 200, description: 'Slug availability check result' })
  async checkSlug(@Param('slug') slug: string) {
    return this.workspaceService.checkSlugAvailability(slug);
  }
}
