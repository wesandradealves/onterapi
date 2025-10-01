import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import { IReceiveAnamnesisAIResultUseCase } from '../../../domain/anamnesis/interfaces/use-cases/receive-anamnesis-ai-result.use-case.interface';
import {
  IAnamnesisRepository,
  IAnamnesisRepositoryToken,
} from '../../../domain/anamnesis/interfaces/repositories/anamnesis.repository.interface';
import {
  AnamnesisAIAnalysis,
  ReceiveAnamnesisAIResultInput,
} from '../../../domain/anamnesis/types/anamnesis.types';
import { AnamnesisErrorFactory } from '../../../shared/factories/anamnesis-error.factory';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';
import { LegalTermsService } from '../../legal/legal-terms.service';

const THERAPEUTIC_PLAN_TERMS_CONTEXT = 'therapeutic_plan';

@Injectable()
export class ReceiveAnamnesisAIResultUseCase
  extends BaseUseCase<ReceiveAnamnesisAIResultInput, AnamnesisAIAnalysis>
  implements IReceiveAnamnesisAIResultUseCase
{
  protected readonly logger = new Logger(ReceiveAnamnesisAIResultUseCase.name);

  constructor(
    @Inject(IAnamnesisRepositoryToken)
    private readonly anamnesisRepository: IAnamnesisRepository,
    private readonly messageBus: MessageBus,
    private readonly legalTermsService: LegalTermsService,
  ) {
    super();
  }

  protected async handle(params: ReceiveAnamnesisAIResultInput): Promise<AnamnesisAIAnalysis> {
    const anamnesis = await this.anamnesisRepository.findById(params.tenantId, params.anamnesisId, {
      latestPlan: true,
      attachments: true,
    });

    if (!anamnesis) {
      throw AnamnesisErrorFactory.notFound();
    }

    let analysis: AnamnesisAIAnalysis;

    try {
      analysis = await this.anamnesisRepository.completeAIAnalysis({
        analysisId: params.analysisId,
        tenantId: params.tenantId,
        clinicalReasoning: params.clinicalReasoning,
        summary: params.summary,
        riskFactors: params.riskFactors,
        recommendations: params.recommendations,
        planText: params.planText,
        reasoningText: params.reasoningText,
        evidenceMap: params.evidenceMap,
        confidence: params.confidence,
        payload: params.payload,
        model: params.model,
        promptVersion: params.promptVersion,
        tokensInput: params.tokensInput,
        tokensOutput: params.tokensOutput,
        latencyMs: params.latencyMs,
        rawResponse: params.rawResponse,
        respondedAt: params.respondedAt,
        status: params.status,
        errorMessage: params.errorMessage,
      });
    } catch (error) {
      this.logger.error('Falha ao completar analise de IA', error as Error);
      throw AnamnesisErrorFactory.notFound('Analise de IA nao encontrada');
    }

    if (params.status === 'completed') {
      const activeTerms = await this.legalTermsService.getActiveTerm(
        THERAPEUTIC_PLAN_TERMS_CONTEXT,
        params.tenantId,
      );

      const plan = await this.anamnesisRepository.saveTherapeuticPlan({
        anamnesisId: params.anamnesisId,
        tenantId: params.tenantId,
        analysisId: params.analysisId,
        clinicalReasoning: params.clinicalReasoning,
        summary: params.summary,
        therapeuticPlan: params.therapeuticPlan,
        riskFactors: params.riskFactors,
        recommendations: params.recommendations,
        planText: params.planText ?? null,
        reasoningText: params.reasoningText ?? null,
        evidenceMap: params.evidenceMap ?? null,
        confidence: params.confidence,
        reviewRequired: true,
        status: 'generated',
        termsVersion: activeTerms?.version,
        termsTextSnapshot: activeTerms?.content,
        termsAccepted: false,
        generatedAt: params.respondedAt,
      });

      await this.messageBus.publish(
        DomainEvents.therapeuticPlanGenerated(
          params.anamnesisId,
          {
            tenantId: params.tenantId,
            planId: plan.id,
            generatedAt: plan.generatedAt,
            confidence: plan.confidence,
            reviewRequired: plan.reviewRequired,
            status: plan.status,
            termsVersion: plan.termsVersion,
          },
          { userId: 'ai-system', tenantId: params.tenantId },
        ),
      );
    }

    await this.messageBus.publish(
      DomainEvents.anamnesisAICompleted(
        params.anamnesisId,
        {
          tenantId: params.tenantId,
          analysisId: analysis.id,
          status: analysis.status,
          respondedAt: analysis.respondedAt ?? params.respondedAt,
          confidence: analysis.confidence,
          clinicalReasoning: analysis.clinicalReasoning,
          summary: analysis.summary,
          errorMessage: analysis.errorMessage,
          payload: analysis.payload,
          model: analysis.model,
          promptVersion: analysis.promptVersion,
          tokensInput: analysis.tokensInput,
          tokensOutput: analysis.tokensOutput,
          latencyMs: analysis.latencyMs,
        },
        { tenantId: params.tenantId, userId: 'ai-system' },
      ),
    );

    return analysis;
  }
}
