import { performance } from "node:perf_hooks";

import { randomUUID } from "node:crypto";

import { AnamnesisCompactSummary } from "../../src/domain/anamnesis/types/anamnesis.types";
import { LocalAIPlanGeneratorService } from "../../src/modules/anamnesis/services/local-ai-plan-generator.service";
import { WorkerConfig } from "./config";
import { buildRecommendations, buildRiskFactors, buildSummary } from "./helpers";
import { AiWorkerRequestBody, ProviderResult, ProviderSuccessResult } from "./types";

const localGenerator = new LocalAIPlanGeneratorService();

interface OpenAIResponseChoice {
  message?: { content?: string | null };
}

interface OpenAIResponseUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
}

interface OpenAIResponseBody {
  id: string;
  model: string;
  choices?: OpenAIResponseChoice[];
  usage?: OpenAIResponseUsage;
}

export async function generateProviderResult(
  config: WorkerConfig,
  job: AiWorkerRequestBody,
  compact: AnamnesisCompactSummary,
): Promise<ProviderResult> {
  const started = performance.now();

  if (config.provider === "local") {
    return generateLocally(config, job, compact, started);
  }

  return generateViaOpenAI(config, job, compact, started);
}

function generateLocally(
  config: WorkerConfig,
  job: AiWorkerRequestBody,
  compact: AnamnesisCompactSummary,
  started: number,
): ProviderSuccessResult {
  const result = localGenerator.generate({
    request: job.payload,
    compact,
    rollupSummary: job.rollupSummary,
  });

  const latencyMs = Math.round(performance.now() - started);

  return {
    status: "completed",
    planText: result.planText,
    reasoningText: result.reasoningText,
    summary: buildSummary(result.summary, config.summaryMaxLength),
    recommendations: result.recommendations,
    riskFactors: result.riskFactors,
    evidenceMap: result.evidenceMap as Array<Record<string, unknown>>,
    confidence: result.confidence,
    tokensInput: result.tokensIn,
    tokensOutput: result.tokensOut,
    latencyMs,
    model: result.model,
    therapeuticPlan: {
      planText: result.planText,
      reasoningText: result.reasoningText,
      recommendations: result.recommendations,
      riskFactors: result.riskFactors,
    },
    payload: {
      provider: "local-rule-engine",
      metadata: job.metadata ?? null,
    },
    rawResponse: {
      mode: "local",
      data: result,
    },
  } satisfies ProviderSuccessResult;
}

async function generateViaOpenAI(
  config: WorkerConfig,
  job: AiWorkerRequestBody,
  compact: AnamnesisCompactSummary,
  started: number,
): Promise<ProviderResult> {
  const apiKey = config.openaiApiKey as string;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  const body = {
    model: config.openaiModel,
    temperature: config.openaiTemperature,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: resolveSystemPrompt(job) },
      { role: "user", content: resolveUserPrompt(job, compact) },
    ],
  };

  try {
    const response = await fetch(`${config.openaiBaseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        status: "failed",
        errorMessage: `OpenAI responded with ${response.status}: ${errorText}`,
        latencyMs: Math.round(performance.now() - started),
        model: config.openaiModel,
        payload: {
          provider: "openai",
          request: body,
        },
      };
    }

    const json = (await response.json()) as OpenAIResponseBody;
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      return {
        status: "failed",
        errorMessage: "OpenAI response missing content",
        latencyMs: Math.round(performance.now() - started),
        model: json.model,
        payload: {
          provider: "openai",
          request: body,
        },
        rawResponse: json as unknown as Record<string, unknown>,
      };
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      return {
        status: "failed",
        errorMessage: `Failed to parse OpenAI JSON: ${(error as Error).message}`,
        latencyMs: Math.round(performance.now() - started),
        model: json.model,
        payload: {
          provider: "openai",
          request: body,
        },
        rawResponse: {
          body: json,
          content,
        },
      };
    }

    const planText = String((parsed.plan_text ?? parsed.planText ?? "").toString().trim());
    const reasoningText = String((parsed.reasoning_text ?? parsed.reasoningText ?? "").toString().trim());
    const confidence = Number(parsed.confidence ?? 0.5);
    const evidenceRaw = Array.isArray(parsed.evidence_map)
      ? (parsed.evidence_map as Array<Record<string, unknown>>)
      : Array.isArray(parsed.evidenceMap)
      ? (parsed.evidenceMap as Array<Record<string, unknown>>)
      : [];

    const recommendations = buildRecommendations(planText);
    const riskFactors = buildRiskFactors(evidenceRaw);
    const latencyMs = Math.round(performance.now() - started);

    return {
      status: "completed",
      planText,
      reasoningText,
      summary: buildSummary(reasoningText || planText, config.summaryMaxLength),
      recommendations,
      riskFactors,
      evidenceMap: evidenceRaw,
      confidence: Number.isFinite(confidence) ? confidence : 0.5,
      tokensInput: json.usage?.prompt_tokens,
      tokensOutput: json.usage?.completion_tokens,
      latencyMs,
      model: json.model,
      therapeuticPlan: {
        planText,
        reasoningText,
        recommendations,
        riskFactors,
      },
      payload: {
        provider: "openai",
        requestId: randomUUID(),
        request: body,
      },
      rawResponse: json as unknown as Record<string, unknown>,
    } satisfies ProviderSuccessResult;
  } catch (error) {
    return {
      status: "failed",
      errorMessage: `OpenAI request failed: ${(error as Error).message}`,
      latencyMs: Math.round(performance.now() - started),
      model: config.openaiModel,
      payload: {
        provider: "openai",
        request: body,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

function resolveSystemPrompt(job: AiWorkerRequestBody): string {
  if (typeof job.systemPrompt === "string" && job.systemPrompt.trim().length > 0) {
    return job.systemPrompt.trim();
  }

  const metadata = job.metadata as Record<string, unknown> | undefined;
  const candidate = metadata && typeof metadata.systemPrompt === "string" ? (metadata.systemPrompt as string) : undefined;

  if (candidate && candidate.trim().length > 0) {
    return candidate.trim();
  }

  return "Você é um agente clínico assistivo. Responda exclusivamente em JSON com campos plan_text, reasoning_text, evidence_map e confidence.";
}

function resolveUserPrompt(job: AiWorkerRequestBody, compact: AnamnesisCompactSummary): string {
  if (typeof job.userPrompt === "string" && job.userPrompt.trim().length > 0) {
    return job.userPrompt.trim();
  }

  const metadata = job.metadata as Record<string, unknown> | undefined;
  const candidate = metadata && typeof metadata.userPrompt === "string" ? (metadata.userPrompt as string) : undefined;

  if (candidate && candidate.trim().length > 0) {
    return candidate.trim();
  }

  return [
    "Considere o resumo acumulado do paciente e a anamnese compacta atual.",
    "Responda em JSON com os campos plan_text, reasoning_text, evidence_map e confidence.",
    JSON.stringify({ rollupSummary: job.rollupSummary, compact }, null, 2),
  ].join("\n");
}
