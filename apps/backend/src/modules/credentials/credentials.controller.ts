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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CredentialsService } from './credentials.service';
import {
  CreateCredentialDto,
  UpdateCredentialDto,
  CredentialCategory,
} from './dto/credentials.dto';

@ApiTags('Admin - Credentials')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller({ path: 'admin/credentials', version: '1' })
export class CredentialsController {
  constructor(private credentialsService: CredentialsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all credentials (masked values)' })
  @ApiResponse({ status: 200, description: 'List of credentials' })
  async getAll() {
    return this.credentialsService.getAll();
  }

  @Get('category/:category')
  @ApiOperation({ summary: 'Get credentials by category' })
  @ApiResponse({ status: 200, description: 'List of credentials in category' })
  async getByCategory(@Param('category') category: CredentialCategory) {
    return this.credentialsService.getByCategory(category);
  }

  @Post()
  @ApiOperation({ summary: 'Create new credential' })
  @ApiResponse({ status: 201, description: 'Credential created' })
  @ApiResponse({ status: 409, description: 'Credential already exists' })
  async create(@Body() dto: CreateCredentialDto) {
    return this.credentialsService.create(dto);
  }

  @Put(':key')
  @ApiOperation({ summary: 'Update credential' })
  @ApiResponse({ status: 200, description: 'Credential updated' })
  @ApiResponse({ status: 404, description: 'Credential not found' })
  async update(
    @Param('key') key: string,
    @Body() dto: UpdateCredentialDto,
  ) {
    return this.credentialsService.update(key, dto);
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete credential' })
  @ApiResponse({ status: 200, description: 'Credential deleted' })
  @ApiResponse({ status: 404, description: 'Credential not found' })
  async delete(@Param('key') key: string) {
    return this.credentialsService.delete(key);
  }

  @Get('test/:key')
  @ApiOperation({ summary: 'Test if credential is available' })
  @ApiResponse({ status: 200, description: 'Credential availability status' })
  async test(@Param('key') key: string) {
    return this.credentialsService.test(key);
  }

  @Post('clear-cache')
  @ApiOperation({ summary: 'Clear credentials cache' })
  @ApiResponse({ status: 200, description: 'Cache cleared' })
  async clearCache() {
    this.credentialsService.clearCache();
    return { message: 'Credentials cache cleared' };
  }
}
