import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { WorkspaceService } from './workspace.service';
import { PagesService } from './pages.service';
import { PostsService } from './posts.service';
import { MenusService } from './menus.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('public/workspace')
@Controller({ path: 'w', version: '1' })
@Public()
export class PublicWorkspaceController {
  constructor(
    private workspaceService: WorkspaceService,
    private pagesService: PagesService,
    private postsService: PostsService,
    private menusService: MenusService,
  ) {}

  @Get(':workspaceSlug')
  @ApiOperation({ summary: 'Get workspace homepage' })
  @ApiResponse({ status: 200, description: 'Homepage found' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async getWorkspaceHome(@Param('workspaceSlug') workspaceSlug: string) {
    return this.pagesService.getPublicHomePage(workspaceSlug);
  }

  @Get(':workspaceSlug/page/:pageSlug')
  @ApiOperation({ summary: 'Get workspace page by slug' })
  @ApiResponse({ status: 200, description: 'Page found' })
  @ApiResponse({ status: 404, description: 'Page not found' })
  async getWorkspacePage(
    @Param('workspaceSlug') workspaceSlug: string,
    @Param('pageSlug') pageSlug: string,
  ) {
    return this.pagesService.getPublicPage(workspaceSlug, pageSlug);
  }

  @Get(':workspaceSlug/blog')
  @ApiOperation({ summary: 'Get workspace blog posts' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Posts found' })
  async getWorkspaceBlog(
    @Param('workspaceSlug') workspaceSlug: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.postsService.getPublicPosts(workspaceSlug, limit, offset);
  }

  @Get(':workspaceSlug/blog/:postSlug')
  @ApiOperation({ summary: 'Get workspace blog post by slug' })
  @ApiResponse({ status: 200, description: 'Post found' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async getWorkspacePost(
    @Param('workspaceSlug') workspaceSlug: string,
    @Param('postSlug') postSlug: string,
  ) {
    const post = await this.postsService.getPublicPost(workspaceSlug, postSlug);
    return { post };
  }

  @Get(':workspaceSlug/menu/:location')
  @ApiOperation({ summary: 'Get workspace menu by location' })
  @ApiResponse({ status: 200, description: 'Menu found' })
  async getWorkspaceMenu(
    @Param('workspaceSlug') workspaceSlug: string,
    @Param('location') location: string,
  ) {
    const menu = await this.menusService.getPublicMenu(workspaceSlug, location);
    return { menu };
  }

  @Get(':workspaceSlug/info')
  @ApiOperation({ summary: 'Get workspace public info' })
  @ApiResponse({ status: 200, description: 'Workspace info found' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async getWorkspaceInfo(@Param('workspaceSlug') workspaceSlug: string) {
    return this.workspaceService.getWorkspaceBySlug(workspaceSlug);
  }
}
