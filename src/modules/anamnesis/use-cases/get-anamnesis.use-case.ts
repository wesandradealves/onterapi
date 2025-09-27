import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { IGetAnamnesisUseCase } from '../../../domain/anamnesis/interfaces/use-cases/get-anamnesis.use-case.interface';
import {
  IAnamnesisRepository,
  IAnamnesisRepositoryToken,
} from '../../../domain/anamnesis/interfaces/repositories/anamnesis.repository.interface';
import { Anamnesis } from '../../../domain/anamnesis/types/anamnesis.types';
import { AnamnesisErrorFactory } from '../../../shared/factories/anamnesis-error.factory';
import { ensureCanViewAnamnesis } from '../utils/anamnesis-permissions.util';

interface GetAnamnesisQuery {
  tenantId: string;
  anamnesisId: string;
  includeSteps?: boolean;
  includeLatestPlan?: boolean;
  includeAttachments?: boolean;
  requesterId: string;
  requesterRole: string;
}

@Injectable()
export class GetAnamnesisUseCase
  extends BaseUseCase<GetAnamnesisQuery, Anamnesis>
  implements IGetAnamnesisUseCase
{
  protected readonly logger = new Logger(GetAnamnesisUseCase.name);

  constructor(
    @Inject(IAnamnesisRepositoryToken)
    private readonly anamnesisRepository: IAnamnesisRepository,
  ) {
    super();
  }

  protected async handle(params: GetAnamnesisQuery): Promise<Anamnesis> {
    const record = await this.anamnesisRepository.findById(params.tenantId, params.anamnesisId, {
      steps: params.includeSteps,
      latestPlan: params.includeLatestPlan,
      attachments: params.includeAttachments,
    });

    if (!record) {
      throw AnamnesisErrorFactory.notFound();
    }

    ensureCanViewAnamnesis({
      requesterId: params.requesterId,
      requesterRole: params.requesterRole,
      professionalId: record.professionalId,
      patientId: record.patientId,
    });

    return record;
  }
}
