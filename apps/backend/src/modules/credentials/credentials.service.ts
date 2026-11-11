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

    if (
      process.env.NODE_ENV === 'production' &&
      !this.configService.get<string>('CREDENTIALS_ENCRYPTION_KEY')
    ) {
      throw new Error('CREDENTIALS_ENCRYPTION_KEY must be set in production.');
    }
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
      { key: 'ANTHROPIC_API_KEY', category: 'anthropic', description: 'Anthropic API key for Claude AI page generation' },
      { key: 'META_AD_LIBRARY_TOKEN', category: 'meta', description: 'Meta access token for the public Ad Library API (competitor ad observation)' },
      { key: 'S3_ENDPOINT', category: 'aws', description: 'S3-compatible endpoint (MinIO, self-hosted). Leave blank for AWS.' },
      { key: 'S3_PUBLIC_BASE_URL', category: 'aws', description: 'Public base URL when using a custom S3 endpoint' },
      { key: 'OPENAI_BASE_URL', category: 'ai', description: 'OpenAI-compatible base URL (Azure OpenAI or a gateway). Blank = api.openai.com' },
      { key: 'ICONSCOUT_CLIENT_ID', category: 'assets', description: 'IconScout API Client-ID (illustrations, 3D, Lottie). Confirm your plan includes API access and permits redistribution in customer deliverables.' },
      { key: 'REMOVEBG_API_KEY', category: 'assets', description: 'remove.bg API key for practitioner photo cutouts' },
      // Image generation for the artwork layer of designs
      { key: 'OPENAI_API_KEY', category: 'ai', description: 'OpenAI API key (gpt-image-1 artwork generation, competitor research)' },
      { key: 'GEMINI_API_KEY', category: 'ai', description: 'Google Gemini API key (gemini-2.5-flash-image artwork generation)' },
      // Free stock photo APIs (both free tiers, used by the design asset layer)
      { key: 'PEXELS_API_KEY', category: 'assets', description: 'Pexels API key for free stock photography' },
      { key: 'PIXABAY_API_KEY', category: 'assets', description: 'Pixabay API key for free stock photography' },
      // Cloudflare R2 (primary object storage)
      { key: 'R2_ACCOUNT_ID', category: 'r2', description: 'Cloudflare account ID (from the R2 dashboard)' },
      { key: 'R2_ACCESS_KEY_ID', category: 'r2', description: 'R2 API token access key ID' },
      { key: 'R2_SECRET_ACCESS_KEY', category: 'r2', description: 'R2 API token secret access key' },
      { key: 'R2_BUCKET', category: 'r2', description: 'R2 bucket name for uploads and rendered designs' },
      { key: 'R2_PUBLIC_BASE_URL', category: 'r2', description: 'Public bucket URL, e.g. https://pub-xxxx.r2.dev or your custom domain. Required: social platforms download media by URL.' },
      // AWS S3 (fallback when R2 is not configured)
      { key: 'AWS_ACCESS_KEY_ID', category: 'aws', description: 'AWS Access Key ID for S3 uploads' },
      { key: 'AWS_SECRET_ACCESS_KEY', category: 'aws', description: 'AWS Secret Access Key for S3 uploads' },
      { key: 'AWS_S3_BUCKET', category: 'aws', description: 'AWS S3 Bucket name for file uploads' },
      { key: 'AWS_S3_REGION', category: 'aws', description: 'AWS S3 Region (e.g., ap-south-1)' },
      // Google Ads
      { key: 'GOOGLE_ADS_DEVELOPER_TOKEN', category: 'google', description: 'Google Ads Developer Token' },
      { key: 'GOOGLE_ADS_MANAGER_ID', category: 'google', description: 'Google Ads Manager Account ID' },
      // Email / SMTP
      { key: 'SMTP_HOST', category: 'email', description: 'SMTP server host (e.g., smtp.gmail.com)' },
      { key: 'SMTP_PORT', category: 'email', description: 'SMTP server port (e.g., 587)' },
      { key: 'SMTP_USER', category: 'email', description: 'SMTP username/email' },
      { key: 'SMTP_PASS', category: 'email', description: 'SMTP password or app password' },
      { key: 'SMTP_FROM_EMAIL', category: 'email', description: 'Default sender email address' },
      { key: 'SMTP_FROM_NAME', category: 'email', description: 'Default sender display name' },
      // Video Generation
      { key: 'HEYGEN_API_KEY', category: 'video', description: 'HeyGen API key for video generation' },
      { key: 'RUNWAY_API_KEY', category: 'video', description: 'Runway ML API key for video generation' },
      // LinkedIn
      { key: 'LINKEDIN_CLIENT_ID', category: 'linkedin', description: 'LinkedIn OAuth Client ID' },
      { key: 'LINKEDIN_CLIENT_SECRET', category: 'linkedin', description: 'LinkedIn OAuth Client Secret' },
      // TikTok
      { key: 'TIKTOK_CLIENT_KEY', category: 'tiktok', description: 'TikTok OAuth Client Key' },
      { key: 'TIKTOK_CLIENT_SECRET', category: 'tiktok', description: 'TikTok OAuth Client Secret' },
      // Trends
      { key: 'SERPAPI_KEY', category: 'trends', description: 'SerpAPI key for Google Trends data' },
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
