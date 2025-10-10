import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { format } from 'util';
import { AuthModule } from '../../../modules/auth/auth.module';
import { UsersModule } from '../../../modules/users/users.module';
import { PatientsModule } from '../../../modules/patients/patients.module';
import { AnamnesisModule } from '../../../modules/anamnesis/anamnesis.module';
import { HealthModule } from '../../../modules/health/health.module';
import { SchedulingModule } from '../../../modules/scheduling/scheduling.module';

export default class Swagger {
  static logger = new Logger(Swagger.name);
  static swaggerInit(app: INestApplication) {
    const pathName = 'docs';
    const options = new DocumentBuilder()
      .setTitle('OnTerapi API')
      .setDescription('API for OnTerapi Platform')
      .setVersion(process.env.npm_package_version || '1.0.0')
      .addBearerAuth()
      .addServer('/')
      .addServer(process.env.SWAGGER_SERVER_URL || process.env.API_URL || 'http://localhost:3000')
      .build();

    const document = SwaggerModule.createDocument(app, options, {
      deepScanRoutes: true,
      include: [AuthModule, UsersModule, PatientsModule, AnamnesisModule, HealthModule, SchedulingModule],
      operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    });

    SwaggerModule.setup(pathName, app, document, {
      customSiteTitle: 'OnTerapi API Docs',
      customfavIcon: 'https://nestjs.com/img/logo_text.svg',
      customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.10.3/swagger-ui.min.css',
      customJs: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.10.3/swagger-ui-bundle.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.10.3/swagger-ui-standalone-preset.min.js',
      ],
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });

    this.logger.log(format('Swagger running on pathName %s', pathName));
  }
}
