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
        confidence: params.confidence,
        payload: params.payload,
        respondedAt: params.respondedAt,
        status: params.status,
        errorMessage: params.errorMessage,
      });
    } catch (error) {
      this.logger.error('Falha ao completar analise de IA', error as Error);
      throw AnamnesisErrorFactory.notFound('Analise de IA nao encontrada');
    }

    if (params.status === 'completed') {
      const plan = await this.anamnesisRepository.saveTherapeuticPlan({
        anamnesisId: params.anamnesisId,
        tenantId: params.tenantId,
        clinicalReasoning: params.clinicalReasoning,
        summary: params.summary,
        therapeuticPlan: params.therapeuticPlan,
        riskFactors: params.riskFactors,
        recommendations: params.recommendations,
        confidence: params.confidence,
        reviewRequired: true,
        generatedAt: params.respondedAt,
      });

      await this.messageBus.publish(
        DomainEvents.therapeuticPlanGenerated(
          params.anamnesisId,
          {
            tenantId: params.tenantId,
            generatedAt: plan.generatedAt,
            confidence: plan.confidence,
            reviewRequired: plan.reviewRequired,
            planId: plan.id,
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
        },
        { tenantId: params.tenantId, userId: 'ai-system' },
      ),
    );

    return analysis;
  }
}
