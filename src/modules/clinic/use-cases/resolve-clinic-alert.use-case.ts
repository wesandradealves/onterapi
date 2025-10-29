import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { ClinicAlert, ResolveClinicAlertInput } from '../../../domain/clinic/types/clinic.types';
import {
  type IResolveClinicAlertUseCase,
  IResolveClinicAlertUseCase as IResolveClinicAlertUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/resolve-clinic-alert.use-case.interface';
import {
  type IClinicMetricsRepository,
  IClinicMetricsRepository as IClinicMetricsRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-metrics.repository.interface';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';

@Injectable()
export class ResolveClinicAlertUseCase
  extends BaseUseCase<ResolveClinicAlertInput, ClinicAlert>
  implements IResolveClinicAlertUseCase
{
  protected readonly logger = new Logger(ResolveClinicAlertUseCase.name);

  constructor(
    @Inject(IClinicMetricsRepositoryToken)
    private readonly clinicMetricsRepository: IClinicMetricsRepository,
    private readonly messageBus: MessageBus,
  ) {
    super();
  }

  protected async handle(input: ResolveClinicAlertInput): Promise<ClinicAlert> {
    const alert = await this.clinicMetricsRepository.findAlertById(input.alertId);

    if (!alert || alert.tenantId !== input.tenantId) {
      throw ClinicErrorFactory.clinicNotFound('Alerta nao encontrado');
    }

    if (alert.resolvedAt) {
      return alert;
    }

    const resolved = await this.clinicMetricsRepository.resolveAlert({
      alertId: input.alertId,
      resolvedBy: input.resolvedBy,
      resolvedAt: input.resolvedAt,
    });

    const finalAlert = resolved ?? {
      ...alert,
      resolvedAt: input.resolvedAt ?? new Date(),
      resolvedBy: input.resolvedBy,
    };

    await this.messageBus.publish(
      DomainEvents.clinicAlertResolved(input.alertId, {
        tenantId: finalAlert.tenantId,
        clinicId: finalAlert.clinicId,
        type: finalAlert.type,
        channel: finalAlert.channel,
        resolvedBy: input.resolvedBy,
        resolvedAt: finalAlert.resolvedAt ?? new Date(),
        triggeredAt: finalAlert.triggeredAt,
        triggeredBy: finalAlert.triggeredBy,
        payload: finalAlert.payload ?? {},
      }),
    );

    return finalAlert;
  }
}

export const ResolveClinicAlertUseCaseToken = IResolveClinicAlertUseCaseToken;
