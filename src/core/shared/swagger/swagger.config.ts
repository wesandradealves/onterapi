import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerDocumentOptions, SwaggerModule } from '@nestjs/swagger';
import { format } from 'util';
import { AuthModule } from '../../../modules/auth/auth.module';
import { UsersModule } from '../../../modules/users/users.module';
import { PatientsModule } from '../../../modules/patients/patients.module';
import { AnamnesisModule } from '../../../modules/anamnesis/anamnesis.module';
import { HealthModule } from '../../../modules/health/health.module';
import { SchedulingModule } from '../../../modules/scheduling/scheduling.module';
import { ClinicModule } from '../../../modules/clinic/clinic.module';

const SWAGGER_PATH_NAME = 'docs';
const SWAGGER_INCLUDED_MODULES = [
  AuthModule,
  UsersModule,
  PatientsModule,
  AnamnesisModule,
  HealthModule,
  SchedulingModule,
  ClinicModule,
];

export default class Swagger {
  static logger = new Logger(Swagger.name);

  private static buildDocumentConfig(): SwaggerDocumentOptions {
    return {
      deepScanRoutes: true,
      include: SWAGGER_INCLUDED_MODULES,
      operationIdFactory: (_controllerKey: string, methodKey: string) => methodKey,
    };
  }

  private static buildDocumentBuilder() {
    return new DocumentBuilder()
      .setTitle('OnTerapi API')
      .setDescription('API for OnTerapi Platform')
      .setVersion(process.env.npm_package_version || '1.0.0')
      .addBearerAuth()
      .addServer('/')
      .addServer(process.env.SWAGGER_SERVER_URL || process.env.API_URL || 'http://localhost:3000')
      .build();
  }

  static createDocument(app: INestApplication) {
    const builder = this.buildDocumentBuilder();
    const documentConfig = this.buildDocumentConfig();

    return SwaggerModule.createDocument(app, builder, documentConfig);
  }

  static swaggerInit(app: INestApplication) {
    const document = this.createDocument(app);

    SwaggerModule.setup(SWAGGER_PATH_NAME, app, document, {
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

    this.logger.log(format('Swagger running on pathName %s', SWAGGER_PATH_NAME));
  }
}
