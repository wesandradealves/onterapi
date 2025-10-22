import { Inject, Injectable } from '@nestjs/common';

import {
  type IClinicServiceTypeRepository,
  IClinicServiceTypeRepository as IClinicServiceTypeRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-service-type.repository.interface';
import {
  ClinicInvitationEconomicSummary,
  ClinicSplitRecipient,
} from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';

interface ValidateOptions {
  allowInactive?: boolean;
}

@Injectable()
export class ClinicInvitationEconomicSummaryValidator {
  constructor(
    @Inject(IClinicServiceTypeRepositoryToken)
    private readonly serviceTypeRepository: IClinicServiceTypeRepository,
  ) {}

  async validate(
    clinicId: string,
    tenantId: string,
    summary: ClinicInvitationEconomicSummary | undefined,
    options?: ValidateOptions,
  ): Promise<void> {
    if (!summary || summary.items.length === 0) {
      throw ClinicErrorFactory.invalidClinicData(
        'Convite deve conter resumo economico com pelo menos um servico',
      );
    }

    const expectedOrder: ClinicSplitRecipient[] = [
      'taxes',
      'gateway',
      'clinic',
      'professional',
      'platform',
    ];

    if (
      summary.orderOfRemainders.length !== expectedOrder.length ||
      !expectedOrder.every((recipient, idx) => summary.orderOfRemainders[idx] === recipient)
    ) {
      throw ClinicErrorFactory.invalidClinicData(
        'Ordem das sobras deve seguir o padrao impostos>gateway>clinica>profissional>plataforma',
      );
    }

    if (summary.roundingStrategy !== 'half_even') {
      throw ClinicErrorFactory.invalidClinicData(
        'Estrategia de arredondamento invalida no convite',
      );
    }

    const seenServices = new Set<string>();
    for (const item of summary.items) {
      if (seenServices.has(item.serviceTypeId)) {
        throw ClinicErrorFactory.invalidClinicData(
          `Resumo economico contem duplicidade para o tipo ${item.serviceTypeId}`,
        );
      }
      seenServices.add(item.serviceTypeId);
    }

    const serviceTypes = await this.serviceTypeRepository.list({
      clinicId,
      tenantId,
      includeInactive: options?.allowInactive ?? false,
    });
    const serviceMap = new Map(serviceTypes.map((service) => [service.id, service]));

    for (const item of summary.items) {
      const service = serviceMap.get(item.serviceTypeId);
      if (!service) {
        throw ClinicErrorFactory.invalidClinicData(
          `Tipo de servico ${item.serviceTypeId} nao encontrado ou inativo`,
        );
      }
      if (!service.isActive && !options?.allowInactive) {
        throw ClinicErrorFactory.invalidClinicData(
          `Tipo de servico ${service.name} esta inativo e nao pode compor o convite`,
        );
      }
      if (item.price !== service.price) {
        throw ClinicErrorFactory.invalidClinicData(
          `Preco do tipo ${service.name} divergente do configurado na clinica`,
        );
      }
      if (item.currency !== service.currency) {
        throw ClinicErrorFactory.invalidClinicData(
          `Moeda do tipo ${service.name} divergente do configurado na clinica`,
        );
      }
      if (item.payoutModel === 'percentage') {
        if (item.payoutValue < 0 || item.payoutValue > 100) {
          throw ClinicErrorFactory.invalidClinicData(
            `Percentual de repasse invalido para tipo ${service.name}`,
          );
        }
      } else if (item.payoutModel === 'fixed') {
        if (item.payoutValue < 0 || item.payoutValue > item.price) {
          throw ClinicErrorFactory.invalidClinicData(
            `Valor fixo de repasse invalido para tipo ${service.name}`,
          );
        }
      }
    }
  }
}
