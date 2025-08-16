import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { TerminusModule } from '@nestjs/terminus';
import { MessageBusModule } from '@shared/messaging/message-bus.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
      cache: true,
    }),

    // Database
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'onterapi_v4',
      entities: ['dist/**/*.entity{.ts,.js}'],
      migrations: ['dist/infrastructure/database/migrations/*{.ts,.js}'],
      synchronize: false, // Never true in production
      logging: process.env.NODE_ENV === 'development',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    }),

    // Queue
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),

    // Health checks
    TerminusModule,

    // Message Bus (Event-Driven)
    MessageBusModule,

    // Domain Modules will be imported here
    // AuthModule,
    // PatientsModule,
    // AppointmentsModule,
    // etc...
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}