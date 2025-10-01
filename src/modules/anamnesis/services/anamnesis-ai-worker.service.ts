import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DomainEvent } from '../../../shared/events/domain-event.interface';
import { DomainEvents } from '../../../shared/events/domain-events';
import { MessageBus } from '../../../shared/messaging/message-bus';
import {
  AnamnesisAIRequestedEventPayload,
  AnamnesisAIRequestPayload,
  AnamnesisCompactSummary,
  AnamnesisStepKey,
} from '../../../domain/anamnesis/types/anamnesis.types';
import { buildAnamnesisAIPrompt } from '../utils/anamnesis-ai-prompt.util';
import { LocalAIPlanGeneratorService } from './local-ai-plan-generator.service';
import { IReceiveAnamnesisAIResultUseCase } from '../../../domain/anamnesis/interfaces/use-cases/receive-anamnesis-ai-result.use-case.interface';

interface AiWorkerRequestBody {
  analysisId: string;
  anamnesisId: string;
  tenantId: string;
  promptVersion: string;
  systemPrompt: string;
  userPrompt: string;
  payload: AnamnesisAIRequestPayload;
  compact: Record<string, unknown>;
  rollupSummary: string;
  metadata?: Record<string, unknown>;
}

const DEFAULT_TIMEOUT_MS = 15000;
const PROMPT_VERSION_FALLBACK = 'v1.0';
const TIMEOUT_ENV_KEY = 'ANAMNESIS_AI_WORKER_TIMEOUT_MS';
const ENDPOINT_ENV_KEY = 'ANAMNESIS_AI_WORKER_URL';
const TOKEN_ENV_KEY = 'ANAMNESIS_AI_WORKER_TOKEN';
const PROMPT_VERSION_ENV_KEY = 'ANAMNESIS_AI_PROMPT_VERSION';
const MODE_ENV_KEY = 'ANAMNESIS_AI_WORKER_MODE';

@Injectable()
export class AnamnesisAIWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnamnesisAIWorkerService.name);
  private listener?: (event: DomainEvent<AnamnesisAIRequestedEventPayload>) => void;

  constructor(
    private readonly messageBus: MessageBus,
    private readonly configService: ConfigService,
    private readonly localPlanGenerator: LocalAIPlanGeneratorService,
    @Inject(IReceiveAnamnesisAIResultUseCase)
    private readonly receiveAIResultUseCase: IReceiveAnamnesisAIResultUseCase,
  ) {}

  onModuleInit(): void {
    this.listener = (event) => {
      void this.handleAIRequested(event);
    };

    this.messageBus.subscribe(DomainEvents.ANAMNESIS_AI_REQUESTED, this.listener);
    this.logger.log('AI worker subscriber registered for ANAMNESIS_AI_REQUESTED');
  }

  onModuleDestroy(): void {
    if (this.listener) {
      this.messageBus.unsubscribe(
        DomainEvents.ANAMNESIS_AI_REQUESTED,
        this.listener as unknown as (...args: unknown[]) => void,
      );
      this.listener = undefined;
    }
  }

  async handleAIRequested(event: DomainEvent<AnamnesisAIRequestedEventPayload>): Promise<void> {
    const payload = event.payload;
    const analysisPayload = payload.payload;
    const compact = this.resolveCompactSummary(analysisPayload);
    const promptVersion =
      this.configService.get<string>(PROMPT_VERSION_ENV_KEY) ?? PROMPT_VERSION_FALLBACK;
    const prompt = buildAnamnesisAIPrompt({
      request: analysisPayload,
      compact,
      promptVersion,
    });

    const mode = (this.configService.get<string>(MODE_ENV_KEY) ?? 'http').toLowerCase();
    if (mode === 'local') {
      await this.processLocally(
        event,
        analysisPayload,
        compact,
        promptVersion,
        prompt.rollupSummary,
      );
      return;
    }

    const endpoint = this.configService.get<string>(ENDPOINT_ENV_KEY);

    if (!endpoint) {
      this.logger.warn(
        'AI worker URL not configured (ANAMNESIS_AI_WORKER_URL). Skipping dispatch.',
      );
      return;
    }

    const body: AiWorkerRequestBody = {
      analysisId: payload.analysisId,
      anamnesisId: payload.anamnesisId,
      tenantId: payload.tenantId,
      promptVersion: prompt.version,
      systemPrompt: prompt.system,
      userPrompt: prompt.user,
      payload: analysisPayload,
      compact: prompt.compact,
      rollupSummary: prompt.rollupSummary,
      metadata: {
        ...payload.metadata,
        requestedAt: event.occurredOn.toISOString(),
      },
    };

    const token = this.configService.get<string>(TOKEN_ENV_KEY);
    const timeoutMs = this.resolveTimeout();

    try {
      await this.postToWorker(endpoint, body, token, timeoutMs);
      this.logger.log(
        `AI worker request dispatched for analysis ${payload.analysisId}`,
        JSON.stringify({ tenantId: payload.tenantId, anamnesisId: payload.anamnesisId }),
      );
    } catch (error) {
      this.logger.error('Failed to dispatch AI worker request', error as Error, {
        analysisId: payload.analysisId,
        anamnesisId: payload.anamnesisId,
        tenantId: payload.tenantId,
      });
    }
  }

  private resolveCompactSummary(request: AnamnesisAIRequestPayload): AnamnesisCompactSummary {
    const compactCandidate = request.metadata?.compactAnamnesis as
      | AnamnesisCompactSummary
      | undefined;

    if (compactCandidate && compactCandidate.id === request.anamnesisId) {
      return compactCandidate;
    }

    const steps = Object.entries(request.steps).map(([key, payload]) => ({
      key: key as AnamnesisStepKey,
      completed: true,
      payload: (payload as Record<string, unknown>) ?? {},
    }));

    return {
      id: request.anamnesisId,
      tenantId: request.tenantId,
      consultationId: request.consultationId,
      patientId: request.patientId,
      professionalId: request.professionalId,
      status: request.status,
      submittedAt: request.submittedAt,
      completionRate:
        typeof request.metadata?.completionRate === 'number'
          ? (request.metadata.completionRate as number)
          : 0,
      steps,
      attachments: request.attachments.map((attachment) => ({
        id: attachment.id,
        fileName: attachment.fileName,
        stepNumber: attachment.stepNumber,
      })),
    };
  }
  private async processLocally(
    event: DomainEvent<AnamnesisAIRequestedEventPayload>,
    request: AnamnesisAIRequestPayload,
    compact: AnamnesisCompactSummary,
    promptVersion: string,
    rollupSummary: string,
  ): Promise<void> {
    try {
      const result = this.localPlanGenerator.generate({ request, compact, rollupSummary });

      await this.receiveAIResultUseCase.executeOrThrow({
        tenantId: event.payload.tenantId,
        anamnesisId: event.payload.anamnesisId,
        analysisId: event.payload.analysisId,
        status: 'completed',
        clinicalReasoning: result.reasoningText,
        summary: result.summary,
        riskFactors: result.riskFactors,
        recommendations: result.recommendations,
        planText: result.planText,
        reasoningText: result.reasoningText,
        evidenceMap: result.evidenceMap.map((entry) => ({ ...entry })) as Array<
          Record<string, unknown>
        >,
        confidence: result.confidence,
        therapeuticPlan: {
          planText: result.planText,
          reasoningText: result.reasoningText,
          recommendations: result.recommendations,
          riskFactors: result.riskFactors,
        },
        payload: this.toPlain({
          mode: 'local',
          request,
          compact,
          rollupSummary,
        }),
        model: result.model,
        promptVersion,
        tokensInput: result.tokensIn,
        tokensOutput: result.tokensOut,
        latencyMs: result.latencyMs,
        rawResponse: this.toPlain({ mode: 'local', data: result }),
        respondedAt: new Date(),
      });

      this.logger.log(
        `AI plan generated locally for analysis ${event.payload.analysisId}`,
        JSON.stringify({
          tenantId: event.payload.tenantId,
          anamnesisId: event.payload.anamnesisId,
        }),
      );
    } catch (error) {
      this.logger.error('Failed to generate local AI plan', error as Error, {
        analysisId: event.payload.analysisId,
        anamnesisId: event.payload.anamnesisId,
        tenantId: event.payload.tenantId,
      });
    }
  }

  private toPlain(value: unknown): Record<string, unknown> {
    if (value === null || value === undefined) {
      return {};
    }

    try {
      return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  private resolveTimeout(): number {
    const configured = this.configService.get<string | number | undefined>(TIMEOUT_ENV_KEY);

    if (typeof configured === 'number' && Number.isFinite(configured) && configured > 0) {
      return configured;
    }

    if (typeof configured === 'string') {
      const parsed = Number(configured);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }

    return DEFAULT_TIMEOUT_MS;
  }

  // Protected for easier testing override
  protected async postToWorker(
    endpoint: string,
    body: AiWorkerRequestBody,
    token: string | undefined,
    timeoutMs: number,
  ): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const toJson = (value: unknown): unknown => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body, (_key, value) => toJson(value)),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Worker responded with status ${response.status}: ${errorText}`);
    }
  }
}
