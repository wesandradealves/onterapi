import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

export interface BootstrapOptions {
  module: unknown;
  title?: string;
  description?: string;
  version?: string;
  port?: number;
  globalPrefix?: string;
  enableHelmet?: boolean;
  corsOrigin?: string | string[];
  logLevels?: string[];
  mode?: 'production' | 'test';
}

export class BootstrapFactory {
  static async create(options: BootstrapOptions): Promise<INestApplication> {
    const {
      module,
      title = 'OnTerapi API',
      description = 'API do sistema de gestão para terapias integrativas',
      version = '4.0.0',
      port = 3000,
      globalPrefix = 'api/v1',
      enableHelmet = true,
      corsOrigin = '*',
      logLevels = ['error', 'warn', 'log', 'debug', 'verbose'],
      mode = 'production',
    } = options;

    const logger = new Logger(`Bootstrap-${mode === 'test' ? 'Test' : 'Main'}`);

    const app = await NestFactory.create(module, {
      logger: logLevels as never,
    });

    if (enableHelmet) {
      app.use(helmet());
    }

    app.enableCors({
      origin: corsOrigin,
      credentials: true,
    });

    app.setGlobalPrefix(globalPrefix, {
      exclude: ['health', 'metrics'],
    });

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

    const swaggerConfig = new DocumentBuilder()
      .setTitle(title)
      .setDescription(description)
      .setVersion(version)
      .addBearerAuth()
      .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' })
      .addServer(process.env.API_URL || `http://localhost:${port}`)
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });

    await app.listen(port);

    logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
    logger.log(`📚 Swagger documentation: http://localhost:${port}/api`);
    logger.log(`🏥 OnTerapi v4 - ${mode === 'test' ? 'Test Mode' : 'Production'} initialized`);

    return app;
  }
}
