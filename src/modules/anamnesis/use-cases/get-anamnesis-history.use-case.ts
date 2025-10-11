import { clonePlain } from '../../../shared/utils/clone.util';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  IAnamnesisRepository,
  IAnamnesisRepositoryToken,
} from '../../../domain/anamnesis/interfaces/repositories/anamnesis.repository.interface';
import { IGetAnamnesisHistoryUseCase } from '../../../domain/anamnesis/interfaces/use-cases/get-anamnesis-history.use-case.interface';
import {
  AnamnesisAttachment,
  AnamnesisHistoryData,
  AnamnesisHistoryEntry,
  AnamnesisHistoryFilters,
  AnamnesisStepKey,
  TherapeuticPlanData,
} from '../../../domain/anamnesis/types/anamnesis.types';
import { AnamnesisErrorFactory } from '../../../shared/factories/anamnesis-error.factory';
import { mapRoleToDomain } from '../../../shared/utils/role.utils';
import { RolesEnum } from '../../../domain/auth/enums/roles.enum';

interface GetHistoryParams {
  tenantId: string;
  patientId: string;
  requesterId: string;
  requesterRole: string;
  filters?: AnamnesisHistoryFilters;
}

@Injectable()
export class GetAnamnesisHistoryUseCase
  extends BaseUseCase<GetHistoryParams, AnamnesisHistoryData>
  implements IGetAnamnesisHistoryUseCase
{
  protected readonly logger = new Logger(GetAnamnesisHistoryUseCase.name);

  constructor(
    @Inject(IAnamnesisRepositoryToken)
    private readonly anamnesisRepository: IAnamnesisRepository,
  ) {
    super();
  }

  protected async handle(params: GetHistoryParams): Promise<AnamnesisHistoryData> {
    const role = mapRoleToDomain(params.requesterRole);

    if (!role) {
      throw AnamnesisErrorFactory.unauthorized();
    }

    const allowedRoles = [
      RolesEnum.PROFESSIONAL,
      RolesEnum.CLINIC_OWNER,
      RolesEnum.MANAGER,
      RolesEnum.SUPER_ADMIN,
      RolesEnum.PATIENT,
    ];

    if (!allowedRoles.includes(role)) {
      throw AnamnesisErrorFactory.unauthorized();
    }

    const filters: AnamnesisHistoryFilters = {
      ...params.filters,
    };

    if (role === RolesEnum.PROFESSIONAL) {
      filters.professionalId = params.requesterId;
    }

    if (role === RolesEnum.PATIENT && params.patientId !== params.requesterId) {
      throw AnamnesisErrorFactory.unauthorized();
    }

    const rawEntries = await this.anamnesisRepository.getHistoryByPatient(
      params.tenantId,
      params.patientId,
      filters,
    );

    const entries = rawEntries.map((entry) => this.cloneEntry(entry));

    const sortedEntries = entries.sort((a, b) => {
      const aTime = this.resolveOrderingDate(a);
      const bTime = this.resolveOrderingDate(b);
      return bTime - aTime;
    });

    const hasNonDraftEntries = sortedEntries.some((entry) => entry.status !== 'draft');

    const prefillSteps: Partial<Record<AnamnesisStepKey, Record<string, unknown>>> = {};
    const prefillAttachments: AnamnesisAttachment[] = [];
    const attachmentIds = new Set<string>();

    let sourceAnamnesisId: string | undefined;
    let prefillUpdatedAt: Date | undefined;

    const addAttachments = (attachments: AnamnesisAttachment[]) => {
      for (const attachment of attachments) {
        if (attachmentIds.has(attachment.id)) {
          continue;
        }
        attachmentIds.add(attachment.id);
        prefillAttachments.push(this.cloneAttachment(attachment));
      }
    };

    for (const entry of sortedEntries) {
      if (hasNonDraftEntries && entry.status === 'draft') {
        continue;
      }
      for (const step of entry.steps) {
        if (prefillSteps[step.key]) {
          continue;
        }

        if (!this.hasPayload(step.payload)) {
          continue;
        }

        prefillSteps[step.key] = this.clonePayload(step.payload);

        if (!prefillUpdatedAt || step.updatedAt.getTime() > prefillUpdatedAt.getTime()) {
          prefillUpdatedAt = new Date(step.updatedAt.getTime());
        }

        if (!sourceAnamnesisId) {
          sourceAnamnesisId = entry.id;
          addAttachments(entry.attachments);
        }
      }

      if (!sourceAnamnesisId && entry.attachments.length) {
        sourceAnamnesisId = entry.id;
        addAttachments(entry.attachments);
      }
    }

    return {
      patientId: params.patientId,
      entries: sortedEntries,
      prefill: {
        steps: prefillSteps,
        attachments: prefillAttachments,
        sourceAnamnesisId,
        updatedAt: prefillUpdatedAt,
      },
    };
  }

  private resolveOrderingDate(entry: AnamnesisHistoryEntry): number {
    const submission = entry.submittedAt?.getTime();
    if (typeof submission === 'number') {
      return submission;
    }
    return entry.updatedAt.getTime();
  }

  private hasPayload(payload: Record<string, unknown>): boolean {
    return Object.keys(payload ?? {}).length > 0;
  }

  private clonePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return clonePlain(payload ?? {});
  }

  private cloneAttachment(attachment: AnamnesisAttachment): AnamnesisAttachment {
    return {
      ...attachment,
      uploadedAt: attachment.uploadedAt
        ? new Date(attachment.uploadedAt.getTime())
        : attachment.uploadedAt,
    };
  }

  private clonePlan(plan: TherapeuticPlanData): TherapeuticPlanData {
    return {
      ...plan,
      therapeuticPlan: plan.therapeuticPlan ? clonePlain(plan.therapeuticPlan) : undefined,
      riskFactors: plan.riskFactors ? plan.riskFactors.map((factor) => ({ ...factor })) : undefined,
      recommendations: plan.recommendations
        ? plan.recommendations.map((recommendation) => ({ ...recommendation }))
        : undefined,
      generatedAt: new Date(plan.generatedAt.getTime()),
      createdAt: new Date(plan.createdAt.getTime()),
      updatedAt: new Date(plan.updatedAt.getTime()),
      feedbackGivenAt: plan.feedbackGivenAt ? new Date(plan.feedbackGivenAt.getTime()) : undefined,
    };
  }

  private cloneEntry(entry: AnamnesisHistoryEntry): AnamnesisHistoryEntry {
    return {
      id: entry.id,
      consultationId: entry.consultationId,
      professionalId: entry.professionalId,
      status: entry.status,
      completionRate: entry.completionRate,
      submittedAt: entry.submittedAt ? new Date(entry.submittedAt.getTime()) : undefined,
      updatedAt: new Date(entry.updatedAt.getTime()),
      steps: entry.steps.map((step) => ({
        stepNumber: step.stepNumber,
        key: step.key,
        completed: step.completed,
        hasErrors: step.hasErrors,
        validationScore: step.validationScore,
        updatedAt: new Date(step.updatedAt.getTime()),
        payload: this.clonePayload(step.payload),
      })),
      attachments: entry.attachments.map((attachment) => this.cloneAttachment(attachment)),
      latestPlan: entry.latestPlan ? this.clonePlan(entry.latestPlan) : null,
    };
  }
}
