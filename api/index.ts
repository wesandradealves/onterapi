import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import HttpExceptionFilter from '../src/core/shared/exceptions/filter.exception';
import Swagger from '../src/core/shared/swagger/swagger.config';
import express from 'express';
import helmet from 'helmet';

const server = express();
let app: any;

async function createNestApp() {
  const adapter = new ExpressAdapter(server);
  
  app = await NestFactory.create(AppModule, adapter, {
    logger: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['log', 'error', 'warn', 'debug'],
  });

  // Configurações de segurança e CORS
  app.use(helmet());
  
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  });

  // Exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Pipes de validação
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

  // Configuração do Swagger
  Swagger.swaggerInit(app);

  await app.init();
  return app;
}

export default async function handler(req: any, res: any) {
  if (!app) {
    await createNestApp();
  }
  return server(req, res);
}