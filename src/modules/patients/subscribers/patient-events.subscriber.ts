import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { DomainEvent } from '../../../shared/events/domain-event.interface';
import { DomainEvents } from '../../../shared/events/domain-events';

@Injectable()
export class PatientEventsSubscriber {
  private readonly logger = new Logger(PatientEventsSubscriber.name);

  @OnEvent(DomainEvents.PATIENT_CREATED)
  handleCreated(event: DomainEvent) {
    this.logger.log('Paciente criado', event.payload);
  }

  @OnEvent(DomainEvents.PATIENT_UPDATED)
  handleUpdated(event: DomainEvent) {
    this.logger.log('Paciente atualizado', event.payload);
  }

  @OnEvent(DomainEvents.PATIENT_TRANSFERRED)
  handleTransferred(event: DomainEvent) {
    this.logger.log('Paciente transferido', event.payload);
  }

  @OnEvent(DomainEvents.PATIENT_ARCHIVED)
  handleArchived(event: DomainEvent) {
    this.logger.log('Paciente arquivado', event.payload);
  }

  @OnEvent(DomainEvents.PATIENT_RESTORED)
  handleRestored(event: DomainEvent) {
    this.logger.log('Paciente restaurado', event.payload);
  }
}
