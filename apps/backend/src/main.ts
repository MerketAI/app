import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as express from 'express';
import { AppModule } from './app.module';
import {
  LOCAL_UPLOAD_DIR,
  LOCAL_UPLOAD_ROUTE,
  localUploadsEnabled,
} from './modules/upload/upload.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Development only: serve LOCAL_UPLOADS files. Registered before helmet,
  // whose same-origin resource policy would stop another local app (the
  // Quick Care webapp on its own port) from showing these images.
  if (localUploadsEnabled()) {
    app.use(
      LOCAL_UPLOAD_ROUTE,
      (_req: express.Request, res: express.Response, next: express.NextFunction) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        next();
      },
      express.static(LOCAL_UPLOAD_DIR, {
        fallthrough: false,
        index: false,
        // Same rule as object storage: never run stored HTML/SVG/JS when opened directly.
        setHeaders: (res, filePath) => {
          if (/\.(html?|xhtml|svg|xml|js|mjs)$/i.test(filePath)) {
            res.setHeader('Content-Disposition', 'attachment');
          }
        },
      }),
    );
  }

  // Security
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  });

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'api/v',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Marketing Automation API')
    .setDescription('Intelligent Agent-Powered Marketing Workflow Orchestration')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('subscriptions', 'Subscription and credit management')
    .addTag('content', 'Content generation and management')
    .addTag('publishing', 'Social media publishing')
    .addTag('platforms', 'Platform connections')
    .addTag('analytics', 'Analytics and insights')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3002;
  await app.listen(port, '0.0.0.0');

  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
