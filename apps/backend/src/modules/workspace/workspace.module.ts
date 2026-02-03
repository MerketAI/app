import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { CredentialsModule } from '../credentials/credentials.module';

// Services
import { WorkspaceService } from './workspace.service';
import { PagesService } from './pages.service';
import { PostsService } from './posts.service';
import { MenusService } from './menus.service';
import { AiPageService } from './ai-page.service';

// Controllers
import { WorkspaceController } from './workspace.controller';
import { PagesController } from './pages.controller';
import { PostsController } from './posts.controller';
import { MenusController } from './menus.controller';
import { PublicWorkspaceController } from './public.controller';

@Module({
  imports: [PrismaModule, ConfigModule, CredentialsModule],
  controllers: [
    WorkspaceController,
    PagesController,
    PostsController,
    MenusController,
    PublicWorkspaceController,
  ],
  providers: [
    WorkspaceService,
    PagesService,
    PostsService,
    MenusService,
    AiPageService,
  ],
  exports: [
    WorkspaceService,
    PagesService,
    PostsService,
    MenusService,
    AiPageService,
  ],
})
export class WorkspaceModule {}
