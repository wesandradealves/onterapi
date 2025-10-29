import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { ClinicAlert, TriggerClinicAlertInput } from '../../../domain/clinic/types/clinic.types';
import {
  type ITriggerClinicAlertUseCase,
  ITriggerClinicAlertUseCase as ITriggerClinicAlertUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/trigger-clinic-alert.use-case.interface';
import {
  type IClinicRepository,
  IClinicRepository as IClinicRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import {
  type IClinicMetricsRepository,
  IClinicMetricsRepository as IClinicMetricsRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-metrics.repository.interface';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';

@Injectable()
export class TriggerClinicAlertUseCase
  extends BaseUseCase<TriggerClinicAlertInput, ClinicAlert>
  implements ITriggerClinicAlertUseCase
{
  protected readonly logger = new Logger(TriggerClinicAlertUseCase.name);

  constructor(
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject(IClinicMetricsRepositoryToken)
    private readonly clinicMetricsRepository: IClinicMetricsRepository,
    private readonly messageBus: MessageBus,
  ) {
    super();
  }

  protected async handle(input: TriggerClinicAlertInput): Promise<ClinicAlert> {
    const clinic = await this.clinicRepository.findById(input.clinicId);

    if (!clinic || clinic.tenantId !== input.tenantId) {
      throw ClinicErrorFactory.clinicNotFound('Clinica nao encontrada');
    }

    const alert = await this.clinicMetricsRepository.recordAlert({
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      type: input.type,
      channel: input.channel,
      triggeredBy: input.triggeredBy,
      payload: input.payload,
    });

    await this.messageBus.publish(
      DomainEvents.clinicAlertTriggered(alert.id, {
        tenantId: alert.tenantId,
        clinicId: alert.clinicId,
        type: alert.type,
        channel: alert.channel,
        triggeredBy: alert.triggeredBy,
        payload: alert.payload ?? {},
        triggeredAt: alert.triggeredAt,
      }),
    );

    return alert;
  }
}

export const TriggerClinicAlertUseCaseToken = ITriggerClinicAlertUseCaseToken;
