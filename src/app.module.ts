import { Module } from '@nestjs/common';
import { CoreModule } from './core/core.module';
import { DatabaseModule } from './infrastructure/database.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    CoreModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
  ],
})
export class AppModule {}