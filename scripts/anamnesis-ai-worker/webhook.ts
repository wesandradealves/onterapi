import { setTimeout as sleep } from 'node:timers/promises';

import { WorkerConfig } from './config';
import { AiWorkerRequestBody, ProviderResult } from './types';

export interface WebhookOptions {
  maxAttempts: number;
  baseDelayMs: number;
}

const DEFAULT_OPTIONS: WebhookOptions = {
  maxAttempts: 3,
  baseDelayMs: 1000,
};

export async function postResultToBackend(
  config: WorkerConfig,
  job: AiWorkerRequestBody,
  result: ProviderResult,
  options: Partial<WebhookOptions> = {},
): Promise<void> {
  const resolvedOptions = { ...DEFAULT_OPTIONS, ...options, maxAttempts: config.maxRetries };
  const url = `${config.webhookBaseUrl.replace(/\/$/, '')}/anamneses/${job.anamnesisId}/ai-result`;
  const respondedAt = new Date().toISOString();
  const body = buildWebhookBody(job, result, respondedAt);

  for (let attempt = 1; attempt <= resolvedOptions.maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: buildWebhookHeaders(config, job),
        body: JSON.stringify(body),
      });

      if (response.ok) {
        return;
      }

      const errorText = await response.text().catch(() => '');
      throw new Error(`Webhook responded with status ${response.status}: ${errorText}`);
    } catch (error) {
      if (attempt >= resolvedOptions.maxAttempts) {
        throw error;
      }
      const delay = resolvedOptions.baseDelayMs * attempt;
      await sleep(delay);
    }
  }
}

function buildWebhookHeaders(config: WorkerConfig, job: AiWorkerRequestBody): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-anamnesis-ai-secret': config.webhookSecret,
  };

  if (config.tenantHeaderEnabled) {
    headers['x-tenant-id'] = job.tenantId;
  }

  return headers;
}

function buildWebhookBody(
  job: AiWorkerRequestBody,
  result: ProviderResult,
  respondedAt: string,
): Record<string, unknown> {
  const base = {
    analysisId: job.analysisId,
    status: result.status,
    model: result.model,
    promptVersion: job.promptVersion,
    tokensInput: result.tokensInput,
    tokensOutput: result.tokensOutput,
    latencyMs: result.latencyMs,
    rawResponse: result.rawResponse,
    payload: {
      ...result.payload,
      metadata: job.metadata ?? null,
    },
    respondedAt,
  } as Record<string, unknown>;

  if (result.status === 'completed') {
    base.planText = result.planText;
    base.reasoningText = result.reasoningText;
    base.clinicalReasoning = result.reasoningText;
    base.summary = result.summary;
    base.therapeuticPlan = result.therapeuticPlan;
    base.riskFactors = result.riskFactors;
    base.recommendations = result.recommendations;
    base.evidenceMap = result.evidenceMap;
    base.confidence = result.confidence;
  } else {
    base.errorMessage = result.errorMessage;
  }

  return base;
}
