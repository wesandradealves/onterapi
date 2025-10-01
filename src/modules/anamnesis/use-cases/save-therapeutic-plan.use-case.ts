import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';

import { ISaveTherapeuticPlanUseCase } from '../../../domain/anamnesis/interfaces/use-cases/save-therapeutic-plan.use-case.interface';

import {
  IAnamnesisRepository,
  IAnamnesisRepositoryToken,
} from '../../../domain/anamnesis/interfaces/repositories/anamnesis.repository.interface';

import { TherapeuticPlanData } from '../../../domain/anamnesis/types/anamnesis.types';

import { ensureCanModifyAnamnesis } from '../utils/anamnesis-permissions.util';

import { AnamnesisErrorFactory } from '../../../shared/factories/anamnesis-error.factory';

import { MessageBus } from '../../../shared/messaging/message-bus';

import { DomainEvents } from '../../../shared/events/domain-events';

import { PatientAnamnesisRollupService } from '../services/patient-anamnesis-rollup.service';

interface SaveTherapeuticPlanCommand {
  tenantId: string;

  anamnesisId: string;

  analysisId?: string | null;

  clinicalReasoning?: string;

  summary?: string;

  therapeuticPlan?: Record<string, unknown>;

  riskFactors?: TherapeuticPlanData['riskFactors'];

  recommendations?: TherapeuticPlanData['recommendations'];

  planText?: string | null;

  reasoningText?: string | null;

  evidenceMap?: Array<Record<string, unknown>> | null;

  confidence?: number;

  reviewRequired?: boolean;

  termsVersion: string;

  termsTextSnapshot: string;

  acceptanceIp?: string;

  acceptanceUserAgent?: string;

  termsAccepted: boolean;

  generatedAt: Date;

  requesterId: string;

  requesterRole: string;
}

@Injectable()
export class SaveTherapeuticPlanUseCase
  extends BaseUseCase<SaveTherapeuticPlanCommand, TherapeuticPlanData>
  implements ISaveTherapeuticPlanUseCase
{
  protected readonly logger = new Logger(SaveTherapeuticPlanUseCase.name);

  constructor(
    @Inject(IAnamnesisRepositoryToken)
    private readonly anamnesisRepository: IAnamnesisRepository,

    private readonly messageBus: MessageBus,

    private readonly rollupService: PatientAnamnesisRollupService,
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

    const acceptanceTimestamp = new Date();

    const plan = await this.anamnesisRepository.saveTherapeuticPlan({
      anamnesisId: params.anamnesisId,

      tenantId: params.tenantId,

      analysisId: params.analysisId ?? record.latestPlan?.analysisId ?? undefined,

      clinicalReasoning: params.clinicalReasoning,

      summary: params.summary,

      therapeuticPlan: params.therapeuticPlan,

      riskFactors: params.riskFactors,

      recommendations: params.recommendations,

      planText: params.planText ?? null,

      reasoningText: params.reasoningText ?? null,

      evidenceMap: params.evidenceMap ?? null,

      confidence: params.confidence,

      reviewRequired: params.reviewRequired,

      status: 'accepted',

      termsVersion: params.termsVersion,

      termsAccepted: true,

      acceptedAt: acceptanceTimestamp,

      acceptedBy: params.requesterId,

      generatedAt: params.generatedAt,
    });

    await this.anamnesisRepository.createPlanAcceptance({
      tenantId: params.tenantId,

      therapeuticPlanId: plan.id,

      professionalId: params.requesterId,

      acceptedAt: acceptanceTimestamp,

      termsVersion: params.termsVersion,

      termsTextSnapshot: params.termsTextSnapshot,

      acceptedIp: params.acceptanceIp,

      acceptedUserAgent: params.acceptanceUserAgent,
    });

    const acceptances = await this.anamnesisRepository.listPlanAcceptances(
      params.tenantId,

      plan.id,
    );

    plan.status = 'accepted';

    plan.termsAccepted = true;

    plan.acceptedAt = acceptanceTimestamp;

    plan.acceptedBy = params.requesterId;

    plan.termsVersion = params.termsVersion;

    plan.acceptances = acceptances;

    plan.termsTextSnapshot = acceptances.length ? acceptances[0].termsTextSnapshot : null;

    const previousRollup = await this.anamnesisRepository.getPatientRollup(
      params.tenantId,

      record.patientId,
    );

    const rollupInput = this.rollupService.buildSummary({
      tenantId: params.tenantId,

      patientId: record.patientId,

      anamnesis: record,

      plan,

      acceptedBy: params.requesterId,

      acceptedAt: acceptanceTimestamp,

      previousRollup,
    });

    await this.anamnesisRepository.savePatientRollup(rollupInput);

    await this.messageBus.publish(
      DomainEvents.therapeuticPlanGenerated(
        params.anamnesisId,

        {
          tenantId: params.tenantId,

          planId: plan.id,

          generatedAt: plan.generatedAt,

          confidence: plan.confidence,

          reviewRequired: plan.reviewRequired,

          termsAccepted: plan.termsAccepted,

          status: plan.status,

          termsVersion: plan.termsVersion,

          acceptedAt: plan.acceptedAt,

          acceptedBy: plan.acceptedBy,
        },

        { userId: params.requesterId, tenantId: params.tenantId },
      ),
    );

    return plan;
  }
}
