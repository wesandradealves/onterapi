import { Module } from '@nestjs/common';
import { CoreModule } from './core/core.module';
import { DatabaseModule } from './infrastructure/database.module';
import { MessageBusModule } from './shared/messaging/message-bus.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    CoreModule,
    DatabaseModule,
    MessageBusModule,
    HealthModule,
  ],
})
export class AppModule {}