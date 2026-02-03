import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CreatePostDto, UpdatePostDto, SyncWordPressDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('workspace/posts')
@Controller({ path: 'workspace/posts', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PostsController {
  constructor(private postsService: PostsService) {}

  @Get()
  @ApiOperation({ summary: 'List all posts' })
  @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'PUBLISHED'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Posts retrieved successfully' })
  async listPosts(
    @CurrentUser('id') userId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const result = await this.postsService.listPosts(
      userId,
      status,
      limit,
      offset,
    );
    return result;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get post by ID' })
  @ApiResponse({ status: 200, description: 'Post found' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async getPost(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
  ) {
    const post = await this.postsService.getPost(userId, postId);
    return { post };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new post' })
  @ApiResponse({ status: 201, description: 'Post created successfully' })
  @ApiResponse({ status: 409, description: 'Post with this slug already exists' })
  async createPost(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePostDto,
  ) {
    const post = await this.postsService.createPost(userId, dto);
    return { post };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a post' })
  @ApiResponse({ status: 200, description: 'Post updated successfully' })
  async updatePost(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
    @Body() dto: UpdatePostDto,
  ) {
    const post = await this.postsService.updatePost(userId, postId, dto);
    return { post };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a post' })
  @ApiResponse({ status: 204, description: 'Post deleted successfully' })
  async deletePost(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
  ) {
    await this.postsService.deletePost(userId, postId);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish a post' })
  @ApiResponse({ status: 200, description: 'Post published successfully' })
  async publishPost(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
  ) {
    const post = await this.postsService.publishPost(userId, postId);
    return { post };
  }

  @Post(':id/unpublish')
  @ApiOperation({ summary: 'Unpublish a post' })
  @ApiResponse({ status: 200, description: 'Post unpublished successfully' })
  async unpublishPost(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
  ) {
    const post = await this.postsService.unpublishPost(userId, postId);
    return { post };
  }

  @Post(':id/sync-wp')
  @ApiOperation({ summary: 'Sync post to WordPress' })
  @ApiResponse({ status: 200, description: 'Post synced successfully' })
  @ApiResponse({ status: 404, description: 'WordPress connection not found' })
  async syncToWordPress(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
    @Body() dto: SyncWordPressDto,
  ) {
    const post = await this.postsService.syncToWordPress(
      userId,
      postId,
      dto.connectionId,
    );
    return { post };
  }
}
