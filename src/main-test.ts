import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppTestModule } from './app-test.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap-Test');
  
  const app = await NestFactory.create(AppTestModule, {
    logger: ['error', 'warn', 'log'],
  });

  // CORS
  app.enableCors({
    origin: '*',
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'metrics'],
  });

  // Global pipes
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
    .setTitle('OnTerapi API - Test')
    .setDescription('API do sistema de gestão para terapias integrativas - Modo de Teste')
    .setVersion('4.0.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' })
    .addServer('http://localhost:3000')
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  // Start server
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  logger.log(`🚀 Test server running on: http://localhost:${port}/api/v1`);
  logger.log(`📚 Swagger documentation: http://localhost:${port}/api`);
  logger.log(`🧪 OnTerapi v4 - Test Mode (sem banco de dados)`);
}

bootstrap();