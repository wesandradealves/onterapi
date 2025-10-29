import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { ISaveTherapeuticPlanUseCase } from '../../../domain/anamnesis/interfaces/use-cases/save-therapeutic-plan.use-case.interface';
import {
  IAnamnesisRepository,
  IAnamnesisRepositoryToken,
} from '../../../domain/anamnesis/interfaces/repositories/anamnesis.repository.interface';
import { TherapeuticPlanData } from '../../../domain/anamnesis/types/anamnesis.types';
import { AnamnesisErrorFactory } from '../../../shared/factories/anamnesis-error.factory';
import { ensureCanModifyAnamnesis } from '../utils/anamnesis-permissions.util';
import { TherapeuticPlanDomainService } from '../services/therapeutic-plan-domain.service';
import { SaveTherapeuticPlanCommand } from '../types/save-therapeutic-plan-command';

@Injectable()
export class SaveTherapeuticPlanUseCase
  extends BaseUseCase<SaveTherapeuticPlanCommand, TherapeuticPlanData>
  implements ISaveTherapeuticPlanUseCase
{
  protected readonly logger = new Logger(SaveTherapeuticPlanUseCase.name);

  constructor(
    @Inject(IAnamnesisRepositoryToken)
    private readonly anamnesisRepository: IAnamnesisRepository,
    private readonly therapeuticPlanDomainService: TherapeuticPlanDomainService,
  ) {
    super();
  }

  protected async handle(params: SaveTherapeuticPlanCommand): Promise<TherapeuticPlanData> {
    const record = await this.anamnesisRepository.findById(params.tenantId, params.anamnesisId, {
      latestPlan: true,
      steps: true,
      attachments: true,
    });

    if (!record) {
      throw AnamnesisErrorFactory.notFound();
    }

    ensureCanModifyAnamnesis({
      requesterId: params.requesterId,
      requesterRole: params.requesterRole,
      professionalId: record.professionalId,
    });

    if (!params.termsAccepted) {
      throw AnamnesisErrorFactory.invalidPayload(
        'Termo de responsabilidade deve ser aceito para registrar o plano terapeutico.',
      );
    }

    return this.therapeuticPlanDomainService.acceptPlan({ command: params, record });
  }
}
