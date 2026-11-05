import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { decryptTokenFields, encryptTokenFields } from '../common/utils/token-cipher.util';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    });

    const secret = process.env.TOKEN_ENCRYPTION_KEY;
    if (!secret && process.env.NODE_ENV === 'production') {
      throw new Error('TOKEN_ENCRYPTION_KEY must be set in production.');
    }
    if (secret) {
      this.$use(async (params, next) => {
        if (params.model === 'PlatformConnection' && params.args) {
          encryptTokenFields(params.args.data, secret);
          encryptTokenFields(params.args.create, secret);
          encryptTokenFields(params.args.update, secret);
        }
        const result = await next(params);
        decryptTokenFields(result, secret);
        return result;
      });
    }
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }

    const models = Reflect.ownKeys(this).filter(
      (key) => typeof key === 'string' && key[0] !== '_' && key[0] !== '$',
    );

    return Promise.all(
      models.map((modelKey) => (this as any)[modelKey]?.deleteMany?.()),
    );
  }
}
