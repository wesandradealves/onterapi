import { Inject, Injectable } from '@nestjs/common';

import {
  IAnamnesisRepository,
  IAnamnesisRepositoryToken,
} from '../../../domain/anamnesis/interfaces/repositories/anamnesis.repository.interface';
import { Anamnesis, TherapeuticPlanData } from '../../../domain/anamnesis/types/anamnesis.types';
import { AnamnesisErrorFactory } from '../../../shared/factories/anamnesis-error.factory';
import { DomainEvents } from '../../../shared/events/domain-events';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { LegalTermsService } from '../../legal/legal-terms.service';
import { SaveTherapeuticPlanCommand } from '../types/save-therapeutic-plan-command';
import { PatientAnamnesisRollupService } from './patient-anamnesis-rollup.service';

const THERAPEUTIC_PLAN_TERMS_CONTEXT = 'therapeutic_plan';

interface AcceptPlanParams {
  command: SaveTherapeuticPlanCommand;
  record: Anamnesis;
}

@Injectable()
export class TherapeuticPlanDomainService {
  constructor(
    @Inject(IAnamnesisRepositoryToken)
    private readonly anamnesisRepository: IAnamnesisRepository,
    private readonly rollupService: PatientAnamnesisRollupService,
    private readonly legalTermsService: LegalTermsService,
    private readonly messageBus: MessageBus,
  ) {}

  async acceptPlan({ command, record }: AcceptPlanParams): Promise<TherapeuticPlanData> {
    const termsSnapshot = await this.ensureActiveTermIsCurrent(command);
    const acceptanceTimestamp = new Date();

    const plan = await this.anamnesisRepository.saveTherapeuticPlan({
      anamnesisId: command.anamnesisId,
      tenantId: command.tenantId,
      analysisId: command.analysisId ?? record.latestPlan?.analysisId ?? undefined,
      clinicalReasoning: command.clinicalReasoning,
      summary: command.summary,
      therapeuticPlan: command.therapeuticPlan,
      riskFactors: command.riskFactors,
      recommendations: command.recommendations,
      planText: command.planText ?? null,
      reasoningText: command.reasoningText ?? null,
      evidenceMap: command.evidenceMap ?? null,
      confidence: command.confidence,
      reviewRequired: command.reviewRequired,
      status: 'accepted',
      termsVersion: command.termsVersion,
      termsAccepted: true,
      acceptedAt: acceptanceTimestamp,
      acceptedBy: command.requesterId,
      generatedAt: command.generatedAt,
    });

    await this.anamnesisRepository.createPlanAcceptance({
      tenantId: command.tenantId,
      therapeuticPlanId: plan.id,
      professionalId: command.requesterId,
      acceptedAt: acceptanceTimestamp,
      termsVersion: command.termsVersion,
      termsTextSnapshot: termsSnapshot,
      acceptedIp: command.acceptanceIp ?? null,
      acceptedUserAgent: command.acceptanceUserAgent ?? null,
    });

    const acceptances = await this.anamnesisRepository.listPlanAcceptances(
      command.tenantId,
      plan.id,
    );

    plan.status = 'accepted';
    plan.termsAccepted = true;
    plan.acceptedAt = acceptanceTimestamp;
    plan.acceptedBy = command.requesterId;
    plan.termsVersion = command.termsVersion;
    plan.acceptances = acceptances;
    plan.termsTextSnapshot = acceptances.length ? acceptances[0].termsTextSnapshot : termsSnapshot;

    const previousRollup = await this.anamnesisRepository.getPatientRollup(
      command.tenantId,
      record.patientId,
    );

    const rollupInput = this.rollupService.buildSummary({
      tenantId: command.tenantId,
      patientId: record.patientId,
      anamnesis: record,
      plan,
      acceptedBy: command.requesterId,
      acceptedAt: acceptanceTimestamp,
      previousRollup,
    });

    await this.anamnesisRepository.savePatientRollup(rollupInput);

    await this.messageBus.publish(
      DomainEvents.therapeuticPlanGenerated(
        command.anamnesisId,
        {
          tenantId: command.tenantId,
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
        { userId: command.requesterId, tenantId: command.tenantId },
      ),
    );

    return plan;
  }

  private async ensureActiveTermIsCurrent(command: SaveTherapeuticPlanCommand): Promise<string> {
    const activeTerm = await this.legalTermsService.getActiveTerm(
      THERAPEUTIC_PLAN_TERMS_CONTEXT,
      command.tenantId,
    );

    if (!activeTerm) {
      throw AnamnesisErrorFactory.invalidState(
        'Nao ha termo de responsabilidade ativo configurado.',
      );
    }

    if (activeTerm.version !== command.termsVersion) {
      throw AnamnesisErrorFactory.invalidPayload(
        'Versao do termo desatualizada. Recarregue o plano para confirmar o aceite.',
      );
    }

    if (command.termsTextSnapshot) {
      const provided = this.normaliseTermText(command.termsTextSnapshot);
      const expected = this.normaliseTermText(activeTerm.content);

      if (provided !== expected) {
        throw AnamnesisErrorFactory.invalidPayload(
          'Conteudo do termo nao confere com a versao atual. Recarregue o plano.',
        );
      }
    }

    return activeTerm.content;
  }

  private normaliseTermText(text: string): string {
    return text.replace(/\r?\n/g, '\n').trim();
  }
}
