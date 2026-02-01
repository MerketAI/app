import {
  Injectable,
  NotFoundException,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCredentialDto, UpdateCredentialDto } from './dto/credentials.dto';

@Injectable()
export class CredentialsService implements OnModuleInit {
  private encryptionKey: string;
  private algorithm = 'aes-256-gcm';
  private cache: Map<string, { value: string; expiresAt: number }> = new Map();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // Get encryption key from env or generate default (should be set in production)
    this.encryptionKey = this.configService.get<string>(
      'CREDENTIALS_ENCRYPTION_KEY',
      'default-encryption-key-change-in-production-32char',
    ).slice(0, 32).padEnd(32, '0'); // Ensure 32 bytes for AES-256
  }

  async onModuleInit() {
    // Initialize default credentials if none exist
    const count = await this.prisma.apiCredential.count();
    if (count === 0) {
      await this.initializeDefaultCredentials();
    }
  }

  private async initializeDefaultCredentials() {
    const defaults = [
      { key: 'JASPER_API_KEY', category: 'jasper', description: 'Jasper AI API key for content generation' },
      { key: 'JASPER_API_URL', category: 'jasper', description: 'Jasper AI API URL (default: https://api.jasper.ai/v1)' },
      { key: 'META_APP_ID', category: 'meta', description: 'Meta (Facebook/Instagram) App ID' },
      { key: 'META_APP_SECRET', category: 'meta', description: 'Meta (Facebook/Instagram) App Secret' },
      { key: 'GOOGLE_CLIENT_ID', category: 'google', description: 'Google OAuth Client ID' },
      { key: 'GOOGLE_CLIENT_SECRET', category: 'google', description: 'Google OAuth Client Secret' },
      { key: 'RAZORPAY_KEY_ID', category: 'razorpay', description: 'Razorpay Key ID' },
      { key: 'RAZORPAY_KEY_SECRET', category: 'razorpay', description: 'Razorpay Key Secret' },
      { key: 'RAZORPAY_WEBHOOK_SECRET', category: 'razorpay', description: 'Razorpay Webhook Secret' },
      { key: 'WORDPRESS_CLIENT_ID', category: 'wordpress', description: 'WordPress OAuth Client ID' },
      { key: 'WORDPRESS_CLIENT_SECRET', category: 'wordpress', description: 'WordPress OAuth Client Secret' },
    ];

    for (const cred of defaults) {
      await this.prisma.apiCredential.create({
        data: {
          key: cred.key,
          value: this.encrypt(''), // Empty encrypted value
          category: cred.category,
          description: cred.description,
          isActive: false, // Not active until value is set
        },
      });
    }
  }

  private encrypt(text: string): string {
    if (!text) return '';

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.algorithm as crypto.CipherGCMTypes,
      this.encryptionKey,
      iv,
    ) as crypto.CipherGCM;

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  private decrypt(encryptedText: string): string {
    if (!encryptedText) return '';

    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 3) return '';

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const decipher = crypto.createDecipheriv(
        this.algorithm as crypto.CipherGCMTypes,
        this.encryptionKey,
        iv,
      ) as crypto.DecipherGCM;
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      return '';
    }
  }

  private maskValue(value: string): string {
    if (!value || value.length < 8) return '****';
    return value.slice(0, 4) + '****' + value.slice(-4);
  }

  async getAll() {
    const credentials = await this.prisma.apiCredential.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    return credentials.map((cred) => ({
      id: cred.id,
      key: cred.key,
      maskedValue: this.maskValue(this.decrypt(cred.value)),
      description: cred.description,
      category: cred.category,
      isActive: cred.isActive,
      hasValue: !!cred.value && cred.value.length > 0,
      createdAt: cred.createdAt,
      updatedAt: cred.updatedAt,
    }));
  }

  async getByCategory(category: string) {
    const credentials = await this.prisma.apiCredential.findMany({
      where: { category },
      orderBy: { key: 'asc' },
    });

    return credentials.map((cred) => ({
      id: cred.id,
      key: cred.key,
      maskedValue: this.maskValue(this.decrypt(cred.value)),
      description: cred.description,
      category: cred.category,
      isActive: cred.isActive,
      hasValue: !!cred.value && cred.value.length > 0,
      createdAt: cred.createdAt,
      updatedAt: cred.updatedAt,
    }));
  }

  async create(dto: CreateCredentialDto) {
    // Check if key already exists
    const existing = await this.prisma.apiCredential.findUnique({
      where: { key: dto.key },
    });

    if (existing) {
      throw new ConflictException(`Credential with key '${dto.key}' already exists`);
    }

    const credential = await this.prisma.apiCredential.create({
      data: {
        key: dto.key,
        value: this.encrypt(dto.value),
        description: dto.description,
        category: dto.category,
        isActive: true,
      },
    });

    // Invalidate cache
    this.cache.delete(dto.key);

    return {
      id: credential.id,
      key: credential.key,
      maskedValue: this.maskValue(dto.value),
      description: credential.description,
      category: credential.category,
      isActive: credential.isActive,
    };
  }

  async update(key: string, dto: UpdateCredentialDto) {
    const credential = await this.prisma.apiCredential.findUnique({
      where: { key },
    });

    if (!credential) {
      throw new NotFoundException(`Credential with key '${key}' not found`);
    }

    const updateData: any = {};

    if (dto.value !== undefined) {
      updateData.value = this.encrypt(dto.value);
      // If value is being set for first time, activate it
      if (!credential.isActive && dto.value) {
        updateData.isActive = true;
      }
    }

    if (dto.description !== undefined) {
      updateData.description = dto.description;
    }

    if (dto.category !== undefined) {
      updateData.category = dto.category;
    }

    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    const updated = await this.prisma.apiCredential.update({
      where: { key },
      data: updateData,
    });

    // Invalidate cache
    this.cache.delete(key);

    return {
      id: updated.id,
      key: updated.key,
      maskedValue: dto.value ? this.maskValue(dto.value) : this.maskValue(this.decrypt(updated.value)),
      description: updated.description,
      category: updated.category,
      isActive: updated.isActive,
      updatedAt: updated.updatedAt,
    };
  }

  async delete(key: string) {
    const credential = await this.prisma.apiCredential.findUnique({
      where: { key },
    });

    if (!credential) {
      throw new NotFoundException(`Credential with key '${key}' not found`);
    }

    await this.prisma.apiCredential.delete({
      where: { key },
    });

    // Invalidate cache
    this.cache.delete(key);

    return { message: `Credential '${key}' deleted successfully` };
  }

  /**
   * Get decrypted credential value - used internally by services
   * Falls back to environment variable if not found in database
   */
  async get(key: string): Promise<string> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    // Get from database
    const credential = await this.prisma.apiCredential.findUnique({
      where: { key },
    });

    if (credential && credential.isActive) {
      const value = this.decrypt(credential.value);
      if (value) {
        // Cache the value
        this.cache.set(key, {
          value,
          expiresAt: Date.now() + this.cacheTTL,
        });
        return value;
      }
    }

    // Fall back to environment variable
    const envValue = this.configService.get<string>(key, '');
    if (envValue) {
      this.cache.set(key, {
        value: envValue,
        expiresAt: Date.now() + this.cacheTTL,
      });
    }
    return envValue;
  }

  /**
   * Clear all cached credentials
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Test if a credential can be used (has a non-empty value)
   */
  async test(key: string): Promise<{ key: string; available: boolean; source: 'database' | 'env' | 'none' }> {
    const credential = await this.prisma.apiCredential.findUnique({
      where: { key },
    });

    if (credential && credential.isActive) {
      const value = this.decrypt(credential.value);
      if (value) {
        return { key, available: true, source: 'database' };
      }
    }

    const envValue = this.configService.get<string>(key, '');
    if (envValue) {
      return { key, available: true, source: 'env' };
    }

    return { key, available: false, source: 'none' };
  }
}
