import { Global, Module } from '@nestjs/common';
import { MessageBus } from './message-bus';

@Global()
@Module({
  providers: [MessageBus],
  exports: [MessageBus],
})
export class MessagingModule {}
