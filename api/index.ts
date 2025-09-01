import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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
    exclude: ['health', 'metrics', 'api', 'api-json'],
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

  // Configuração do Swagger
  const config = new DocumentBuilder()
    .setTitle('OnTerapi API')
    .setDescription('API for OnTerapi Platform')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addServer('https://onterapi.vercel.app', 'Production')
    .addServer('http://localhost:3001', 'Local Docker')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  await app.init();
  return app;
}

export default async function handler(req: any, res: any) {
  if (!app) {
    await createNestApp();
  }
  return server(req, res);
}