import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CoreModule } from './core/core.module';
import { DatabaseModule } from './infrastructure/database.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PatientsModule } from './modules/patients/patients.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    CoreModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    PatientsModule,
  ],
})
export class AppModule {}
