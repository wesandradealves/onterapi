import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MessageBus } from './message-bus';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      // Use wildcards for event matching
      wildcard: true,
      // Delimiter used to segment event namespaces
      delimiter: '.',
      // Remove event from memory when no listeners
      removeListener: true,
      // Maximum number of listeners that can be assigned to an event
      maxListeners: 20,
      // Show event name in memory leak message when more than maximum amount of listeners is assigned
      verboseMemoryLeak: true,
      // Disable throwing uncaughtException if an error event is emitted and no listeners
      ignoreErrors: false,
    }),
  ],
  providers: [MessageBus],
  exports: [MessageBus],
})
export class MessageBusModule {}
