import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MessageBusModule } from '@shared/messaging/message-bus.module';
import { ExampleModule } from '@modules/example/example.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
      cache: true,
    }),

    // Message Bus (Event-Driven)
    MessageBusModule,

    // Test Module
    ExampleModule,
  ],
  controllers: [],
  providers: [],
})
export class AppTestModule {}