import { AppModule } from './app.module';
import { BootstrapFactory } from './shared/bootstrap/bootstrap.factory';

async function bootstrap() {
  const isTestMode = process.env.NODE_ENV === 'test';

  await BootstrapFactory.create({
    module: AppModule,
    port: Number(process.env.PORT) || 3000,
    corsOrigin: process.env.CORS_ORIGIN?.split(',') || '*',
    enableHelmet: !isTestMode,
    logLevels: isTestMode ? ['error', 'warn', 'log'] : ['error', 'warn', 'log', 'debug', 'verbose'],
    mode: isTestMode ? 'test' : 'production',
  });
}

bootstrap();
