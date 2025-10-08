import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MessagingModule } from '../shared/messaging/messaging.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
      cache: true,
    }),
    MessagingModule,
  ],
  exports: [ConfigModule, MessagingModule],
})
export class CoreModule {}
