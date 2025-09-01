import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import HttpExceptionFilter from './core/shared/exceptions/filter.exception';
import Swagger from './core/shared/swagger/swagger.config';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  Swagger.swaggerInit(app);

  const configService = app.get<ConfigService>(ConfigService);

  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ extended: false }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: false,
    }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  });

  const port = configService.get<string>('PORT') ?? 3000;
  await app.listen(port);
}
bootstrap();