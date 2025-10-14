import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  type IClinicRepository,
  IClinicRepository as IClinicRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic.repository.interface';
import {
  type IClinicMemberRepository,
  IClinicMemberRepository as IClinicMemberRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-member.repository.interface';
import {
  type IClinicConfigurationRepository,
  IClinicConfigurationRepository as IClinicConfigurationRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-configuration.repository.interface';
import {
  type ITransferClinicProfessionalUseCase,
  ITransferClinicProfessionalUseCase as ITransferClinicProfessionalUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/transfer-clinic-professional.use-case.interface';
import {
  Clinic,
  ClinicProfessionalTransferResult,
  ClinicStaffRole,
  TransferClinicProfessionalInput,
} from '../../../domain/clinic/types/clinic.types';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import { ClinicAuditService } from '../../../infrastructure/clinic/services/clinic-audit.service';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';

@Injectable()
export class TransferClinicProfessionalUseCase
  extends BaseUseCase<TransferClinicProfessionalInput, ClinicProfessionalTransferResult>
  implements ITransferClinicProfessionalUseCase
{
  protected readonly logger = new Logger(TransferClinicProfessionalUseCase.name);

  constructor(
    @Inject(IClinicRepositoryToken)
    private readonly clinicRepository: IClinicRepository,
    @Inject(IClinicMemberRepositoryToken)
    private readonly memberRepository: IClinicMemberRepository,
    @Inject(IClinicConfigurationRepositoryToken)
    private readonly configurationRepository: IClinicConfigurationRepository,
    private readonly auditService: ClinicAuditService,
    private readonly messageBus: MessageBus,
  ) {
    super();
  }

  protected async handle(
    input: TransferClinicProfessionalInput,
  ): Promise<ClinicProfessionalTransferResult> {
    if (input.fromClinicId === input.toClinicId) {
      throw ClinicErrorFactory.invalidClinicData(
        'Cl�nica de origem e destino devem ser diferentes',
      );
    }

    const [fromClinic, toClinic] = await Promise.all([
      this.clinicRepository.findById(input.fromClinicId),
      this.clinicRepository.findById(input.toClinicId),
    ]);

    if (!fromClinic) {
      throw ClinicErrorFactory.clinicNotFound('Cl�nica de origem n�o encontrada');
    }

    if (!toClinic) {
      throw ClinicErrorFactory.clinicNotFound('Cl�nica de destino n�o encontrada');
    }

    this.ensureSameTenant(fromClinic, toClinic, input.tenantId);

    const activeMembership = await this.memberRepository.findActiveByClinicAndUser({
      clinicId: input.fromClinicId,
      tenantId: input.tenantId,
      userId: input.professionalId,
    });

    if (!activeMembership) {
      throw ClinicErrorFactory.memberNotFound('Profissional n�o vinculado � cl�nica de origem');
    }

    const existingTargetMembership = await this.memberRepository.findActiveByClinicAndUser({
      clinicId: input.toClinicId,
      tenantId: input.tenantId,
      userId: input.professionalId,
    });

    if (existingTargetMembership) {
      throw ClinicErrorFactory.invalidClinicData(
        'Profissional j� est� ativo na cl�nica de destino',
      );
    }

    await this.ensureQuotaAvailable(toClinic, activeMembership.role);

    const transferResult = await this.memberRepository.transferProfessional({
      tenantId: input.tenantId,
      professionalId: input.professionalId,
      fromClinicId: input.fromClinicId,
      toClinicId: input.toClinicId,
      effectiveDate: input.effectiveDate,
    });

    const enrichedResult: ClinicProfessionalTransferResult = {
      ...transferResult,
      effectiveDate: input.effectiveDate,
      transferPatients: input.transferPatients,
    };

    await this.registerAuditLogs(fromClinic, toClinic, input, enrichedResult);

    await this.messageBus.publish(
      DomainEvents.clinicProfessionalTransferred(
        input.professionalId,
        {
          tenantId: input.tenantId,
          fromClinicId: input.fromClinicId,
          toClinicId: input.toClinicId,
          effectiveDate: input.effectiveDate,
          transferPatients: input.transferPatients,
          fromMembershipId: enrichedResult.fromMembership.id,
          toMembershipId: enrichedResult.toMembership.id,
        },
        {
          userId: input.performedBy,
        },
      ),
    );

    return enrichedResult;
  }

  private ensureSameTenant(fromClinic: Clinic, toClinic: Clinic, tenantId: string): void {
    if (fromClinic.tenantId !== tenantId || toClinic.tenantId !== tenantId) {
      throw ClinicErrorFactory.invalidClinicData('Cl�nicas n�o pertencem ao tenant informado');
    }
  }

  private async ensureQuotaAvailable(clinic: Clinic, role: ClinicStaffRole): Promise<void> {
    const teamConfig = await this.configurationRepository.findLatestAppliedVersion(
      clinic.id,
      'team',
    );

    const quotas = (
      teamConfig?.payload as { quotas?: { role: ClinicStaffRole; limit: number }[] } | undefined
    )?.quotas;

    const quotaEntry = quotas?.find((item) => item.role === role);

    if (!quotaEntry || quotaEntry.limit <= 0) {
      return;
    }

    const hasSlot = await this.memberRepository.hasQuotaAvailable({
      clinicId: clinic.id,
      role,
      limit: quotaEntry.limit,
    });

    if (!hasSlot) {
      throw ClinicErrorFactory.invalidClinicData(
        'Quota de profissionais atingida na cl�nica de destino',
      );
    }
  }

  private async registerAuditLogs(
    fromClinic: Clinic,
    toClinic: Clinic,
    input: TransferClinicProfessionalInput,
    result: ClinicProfessionalTransferResult,
  ): Promise<void> {
    await this.auditService.register({
      tenantId: input.tenantId,
      clinicId: fromClinic.id,
      performedBy: input.performedBy,
      event: 'clinic.professional.transfer_requested',
      detail: {
        professionalId: input.professionalId,
        toClinicId: toClinic.id,
        effectiveDate: input.effectiveDate,
        transferPatients: input.transferPatients,
      },
    });

    await this.auditService.register({
      tenantId: input.tenantId,
      clinicId: toClinic.id,
      performedBy: input.performedBy,
      event: 'clinic.professional.transfer_completed',
      detail: {
        professionalId: input.professionalId,
        fromClinicId: fromClinic.id,
        effectiveDate: input.effectiveDate,
        transferPatients: input.transferPatients,
        previousMembershipId: result.fromMembership.id,
        newMembershipId: result.toMembership.id,
      },
    });
  }
}

export const TransferClinicProfessionalUseCaseToken = ITransferClinicProfessionalUseCaseToken;
