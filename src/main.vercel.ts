import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BootstrapFactory } from './shared/bootstrap/bootstrap.factory';

let cachedApp: any;

export default async function handler(req: any, res: any) {
  if (!cachedApp) {
    const app = await BootstrapFactory.create({
      module: AppModule,
      port: 3000,
      corsOrigin: process.env.CORS_ORIGIN?.split(',') || '*',
      enableHelmet: true,
      mode: 'production',
    });
    
    await app.init();
    cachedApp = app.getHttpAdapter().getInstance();
  }
  
  return cachedApp(req, res);
}