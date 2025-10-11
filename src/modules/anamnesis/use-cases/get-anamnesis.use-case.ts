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
import { LegalTermsService } from '../../legal/legal-terms.service';
import { RolesEnum } from '../../../domain/auth/enums/roles.enum';

const THERAPEUTIC_PLAN_TERMS_CONTEXT = 'therapeutic_plan';

interface GetAnamnesisQuery {
  tenantId: string;
  anamnesisId: string;
  includeSteps?: boolean;
  includeLatestPlan?: boolean;
  includeAttachments?: boolean;
  requesterId: string;
  requesterRole: string;
  requesterIp?: string;
  requesterUserAgent?: string;
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
    private readonly legalTermsService: LegalTermsService,
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

    if (params.includeLatestPlan && record.latestPlan) {
      await this.attachActiveTerms(record, params);
      await this.recordPlanAccess(record, params);
    }

    return record;
  }

  private async attachActiveTerms(record: Anamnesis, params: GetAnamnesisQuery): Promise<void> {
    const plan = record.latestPlan;

    if (!plan) {
      return;
    }

    if (plan.termsAccepted && plan.termsTextSnapshot) {
      return;
    }

    try {
      const activeTerm = await this.legalTermsService.getActiveTerm(
        THERAPEUTIC_PLAN_TERMS_CONTEXT,
        params.tenantId,
      );

      if (!activeTerm) {
        return;
      }

      if (!plan.termsVersion) {
        plan.termsVersion = activeTerm.version;
      }

      if (!plan.termsTextSnapshot) {
        plan.termsTextSnapshot = activeTerm.content;
      }
    } catch (error) {
      this.logger.warn(
        'Failed to load active legal terms',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async recordPlanAccess(record: Anamnesis, params: GetAnamnesisQuery): Promise<void> {
    const plan = record.latestPlan;

    if (!plan || !plan.id || !this.shouldLogPlanAccess(params.requesterRole)) {
      return;
    }

    try {
      await this.anamnesisRepository.createPlanAccessLog({
        tenantId: params.tenantId,
        anamnesisId: record.id,
        planId: plan.id,
        professionalId: params.requesterId,
        viewerRole: params.requesterRole,
        viewedAt: new Date(),
        ipAddress: params.requesterIp ?? null,
        userAgent: params.requesterUserAgent ?? null,
      });
    } catch (error) {
      this.logger.warn(
        'Failed to record plan access log',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private shouldLogPlanAccess(role: string): boolean {
    switch (role) {
      case RolesEnum.PROFESSIONAL:
      case RolesEnum.CLINIC_OWNER:
      case RolesEnum.MANAGER:
      case RolesEnum.SUPER_ADMIN:
        return true;
      default:
        return false;
    }
  }
}
