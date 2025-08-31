import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { BootstrapFactory } from '../src/shared/bootstrap/bootstrap.factory';
import * as express from 'express';

const server = express();
let app: any;

async function createNestApp() {
  const adapter = new ExpressAdapter(server);
  
  app = await NestFactory.create(AppModule, adapter, {
    logger: ['error', 'warn'],
  });

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  });

  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'metrics'],
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