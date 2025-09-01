import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
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

  // Prefixo global da API
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'metrics'],
  });

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

  await app.init();
  return app;
}

export default async function handler(req: any, res: any) {
  // Rota raiz retorna info básica
  if (req.url === '/' || req.url === '') {
    return res.status(200).json({
      name: 'OnTerapi API',
      version: '0.2.4',
      status: 'running',
      health: '/health',
      docs: 'Swagger não disponível em serverless'
    });
  }
  
  if (!app) {
    await createNestApp();
  }
  return server(req, res);
}