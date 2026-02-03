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
import { MenusService } from './menus.service';
import { CreateMenuDto, UpdateMenuDto, UpdateMenuItemsDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('workspace/menus')
@Controller({ path: 'workspace/menus', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MenusController {
  constructor(private menusService: MenusService) {}

  @Get()
  @ApiOperation({ summary: 'List all menus' })
  @ApiResponse({ status: 200, description: 'Menus retrieved successfully' })
  async listMenus(@CurrentUser('id') userId: string) {
    const menus = await this.menusService.listMenus(userId);
    return { menus };
  }

  @Get('options')
  @ApiOperation({ summary: 'Get available pages and posts for menu items' })
  @ApiResponse({ status: 200, description: 'Options retrieved successfully' })
  async getMenuItemOptions(@CurrentUser('id') userId: string) {
    const options = await this.menusService.getMenuItemOptions(userId);
    return options;
  }

  @Get('location/:location')
  @ApiOperation({ summary: 'Get menu by location' })
  @ApiResponse({ status: 200, description: 'Menu found' })
  @ApiResponse({ status: 404, description: 'Menu not found' })
  async getMenuByLocation(
    @CurrentUser('id') userId: string,
    @Param('location') location: string,
  ) {
    const menu = await this.menusService.getMenuByLocation(userId, location);
    return { menu };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get menu by ID' })
  @ApiResponse({ status: 200, description: 'Menu found' })
  @ApiResponse({ status: 404, description: 'Menu not found' })
  async getMenu(
    @CurrentUser('id') userId: string,
    @Param('id') menuId: string,
  ) {
    const menu = await this.menusService.getMenu(userId, menuId);
    return { menu };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new menu' })
  @ApiResponse({ status: 201, description: 'Menu created successfully' })
  @ApiResponse({ status: 409, description: 'Menu for this location already exists' })
  async createMenu(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateMenuDto,
  ) {
    const menu = await this.menusService.createMenu(userId, dto);
    return { menu };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update menu metadata' })
  @ApiResponse({ status: 200, description: 'Menu updated successfully' })
  async updateMenu(
    @CurrentUser('id') userId: string,
    @Param('id') menuId: string,
    @Body() dto: UpdateMenuDto,
  ) {
    const menu = await this.menusService.updateMenu(userId, menuId, dto);
    return { menu };
  }

  @Put(':id/items')
  @ApiOperation({ summary: 'Update menu items' })
  @ApiResponse({ status: 200, description: 'Menu items updated successfully' })
  async updateMenuItems(
    @CurrentUser('id') userId: string,
    @Param('id') menuId: string,
    @Body() dto: UpdateMenuItemsDto,
  ) {
    const menu = await this.menusService.updateMenuItems(userId, menuId, dto);
    return { menu };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a menu' })
  @ApiResponse({ status: 204, description: 'Menu deleted successfully' })
  async deleteMenu(
    @CurrentUser('id') userId: string,
    @Param('id') menuId: string,
  ) {
    await this.menusService.deleteMenu(userId, menuId);
  }
}
