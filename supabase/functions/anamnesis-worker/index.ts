type LogLevel = "debug" | "info" | "warn" | "error";

type AnamnesisStatus = "draft" | "submitted" | "completed" | "cancelled";

type TherapeuticPlanPriority = "low" | "medium" | "high";

interface TherapeuticPlanRecommendation {
  id: string;
  description: string;
  priority: TherapeuticPlanPriority;
}

interface TherapeuticPlanRiskFactor {
  id: string;
  description: string;
  severity: TherapeuticPlanPriority;
}

interface AnamnesisStepSnapshot {
  key: string;
  completed: boolean;
  payload: Record<string, unknown>;
}

interface AnamnesisAttachmentSnapshot {
  id: string;
  fileName: string;
  stepNumber: number;
}

interface AnamnesisCompactSummary {
  id: string;
  tenantId: string;
  consultationId: string;
  patientId: string;
  professionalId: string;
  status: AnamnesisStatus;
  completionRate: number;
  submittedAt: Date;
  steps: AnamnesisStepSnapshot[];
  attachments: AnamnesisAttachmentSnapshot[];
}

interface AnamnesisAIRequestPayload {
  tenantId: string;
  anamnesisId: string;
  consultationId: string;
  professionalId: string;
  patientId: string;
  status: AnamnesisStatus;
  submittedAt?: string | Date;
  steps: Record<string, Record<string, unknown>>;
  attachments: Array<Record<string, unknown>>;
  patientProfile?: Record<string, unknown>;
  professionalProfile?: Record<string, unknown>;
  patientRollup?: Record<string, unknown>;
}

interface AiWorkerRequestBody {
  analysisId: string;
  anamnesisId: string;
  tenantId: string;
  promptVersion: string;
  systemPrompt?: string;
  userPrompt?: string;
  payload: AnamnesisAIRequestPayload;
  compact: Record<string, unknown>;
  rollupSummary: string;
  metadata?: Record<string, unknown>;
}

interface ProviderSuccessResult {
  status: "completed";
  planText: string;
  reasoningText: string;
  summary: string;
  recommendations: TherapeuticPlanRecommendation[];
  riskFactors: TherapeuticPlanRiskFactor[];
  evidenceMap: Array<Record<string, unknown>>;
  confidence: number;
  tokensInput?: number;
  tokensOutput?: number;
  latencyMs: number;
  model?: string;
  therapeuticPlan: Record<string, unknown>;
  payload: Record<string, unknown>;
  rawResponse?: Record<string, unknown>;
}

interface ProviderFailureResult {
  status: "failed";
  errorMessage: string;
  tokensInput?: number;
  tokensOutput?: number;
  latencyMs: number;
  model?: string;
  payload?: Record<string, unknown>;
  rawResponse?: Record<string, unknown>;
}

type ProviderResult = ProviderSuccessResult | ProviderFailureResult;

interface WorkerConfig {
  provider: "openai" | "local";
  workerToken?: string;
  webhookBaseUrl: string;
  webhookSecret: string;
  tenantHeaderEnabled: boolean;
  openaiApiKey?: string;
  openaiModel: string;
  openaiBaseUrl: string;
  openaiTemperature: number;
  maxRetries: number;
  requestTimeoutMs: number;
  summaryMaxLength: number;
  logLevel: LogLevel;
}

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

const config = loadConfig();

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const pathname = url.pathname;

    if (req.method === "GET" && pathname.endsWith("/health")) {
      return jsonResponse({ status: "ok", provider: config.provider });
    }

    if (req.method === "POST" && pathname.endsWith("/jobs/anamnesis-ai-request")) {
      return await handleJobRequest(req);
    }

    return new Response("Not Found", { status: 404 });
  } catch (error) {
    log("error", "Unexpected error handling request", { error: formatError(error) });
    return jsonResponse({ status: "error", message: "internal-error" }, 500);
  }
});

async function handleJobRequest(req: Request): Promise<Response> {
  try {
    assertAuthorized(req);
    const job = await parseJobRequest(req);
    const compact = normalizeCompact(job.compact);

    log("info", "Job received", { analysisId: job.analysisId, tenantId: job.tenantId });

    const started = performance.now();
    const result = await generateProviderResult(config, job, compact, started);
    await postResultToBackend(config, job, result);

    log("info", "Job processed", {
      analysisId: job.analysisId,
      tenantId: job.tenantId,
      status: result.status,
      latencyMs: result.latencyMs,
    });

    return jsonResponse({ status: "accepted" }, 202);
  } catch (error) {
    log("error", "Job processing failed", { error: formatError(error) });
    return jsonResponse({ status: "error", message: formatError(error) }, 500);
  }
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const allowedLevels: LogLevel[] = ["debug", "info", "warn", "error"];
  if (allowedLevels.indexOf(level) < allowedLevels.indexOf(config.logLevel)) {
    return;
  }
  const timestamp = new Date().toISOString();
  const payload = meta ? ` ${JSON.stringify(meta)}` : "";
  console[level](`[${timestamp}] [worker] [${level.toUpperCase()}] ${message}${payload}`);
}

function loadConfig(): WorkerConfig {
  const provider = (Deno.env.get("ANAMNESIS_AI_PROVIDER") ?? "openai") as WorkerConfig["provider"];
  const webhookBaseUrl = requiredEnv("ANAMNESIS_AI_WEBHOOK_BASE_URL");
  const webhookSecret = requiredEnv("ANAMNESIS_AI_WEBHOOK_SECRET");

  const cfg: WorkerConfig = {
    provider,
    workerToken: Deno.env.get("ANAMNESIS_AI_WORKER_TOKEN") ?? undefined,
    webhookBaseUrl,
    webhookSecret,
    tenantHeaderEnabled:
      (Deno.env.get("ANAMNESIS_AI_WEBHOOK_INCLUDE_TENANT") ?? "true").toLowerCase() !== "false",
    openaiApiKey: Deno.env.get("OPENAI_API_KEY") ?? undefined,
    openaiModel: Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini",
    openaiBaseUrl: Deno.env.get("OPENAI_BASE_URL") ?? "https://api.openai.com/v1",
    openaiTemperature: parseNumber(Deno.env.get("OPENAI_TEMPERATURE"), 0.2, 0, 2),
    maxRetries: parseIntSafe(Deno.env.get("ANAMNESIS_AI_WORKER_MAX_RETRIES"), 3, 0, 5),
    requestTimeoutMs: parseIntSafe(Deno.env.get("ANAMNESIS_AI_WORKER_TIMEOUT_MS"), 20000, 1),
    summaryMaxLength: parseIntSafe(Deno.env.get("ANAMNESIS_AI_WORKER_SUMMARY_MAX_LEN"), 600, 10),
    logLevel: (Deno.env.get("ANAMNESIS_AI_WORKER_LOG_LEVEL") ?? "info") as LogLevel,
  };

  if (cfg.provider === "openai" && !cfg.openaiApiKey) {
    throw new Error("OPENAI_API_KEY must be provided when ANAMNESIS_AI_PROVIDER=openai");
  }

  return cfg;
}

function requiredEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

function parseNumber(
  raw: string | undefined,
  fallback: number,
  min?: number,
  max?: number,
): number {
  if (raw === undefined || raw === null || raw === "") {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return fallback;
  }
  if (min !== undefined && value < min) {
    return min;
  }
  if (max !== undefined && value > max) {
    return max;
  }
  return value;
}

function parseIntSafe(
  raw: string | undefined,
  fallback: number,
  min?: number,
  max?: number,
): number {
  const parsed = parseNumber(raw, fallback, min, max);
  return Math.round(parsed);
}

async function parseJobRequest(req: Request): Promise<AiWorkerRequestBody> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new Error("Invalid JSON body payload");
  }

  if (!body || typeof body !== "object") {
    throw new Error("Invalid body payload");
  }

  const {
    analysisId,
    anamnesisId,
    tenantId,
    promptVersion,
    systemPrompt,
    userPrompt,
    payload,
    compact,
    rollupSummary,
    metadata,
  } = body as Partial<AiWorkerRequestBody>;

  if (!analysisId || !anamnesisId || !tenantId || !promptVersion) {
    throw new Error("Missing required AI job fields");
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Missing payload data");
  }

  if (!compact || typeof compact !== "object") {
    throw new Error("Missing compact summary");
  }

  return {
    analysisId,
    anamnesisId,
    tenantId,
    promptVersion,
    systemPrompt,
    userPrompt,
    payload: payload as AnamnesisAIRequestPayload,
    compact,
    rollupSummary: rollupSummary ?? "",
    metadata,
  };
}

function assertAuthorized(req: Request): void {
  if (!config.workerToken) {
    return;
  }

  const header =
    req.headers.get("x-worker-token") ??
    req.headers.get("authorization");

  if (!header) {
    throw new Error("Unauthorized: missing bearer token");
  }

  const token = header.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : header;

  if (token !== config.workerToken) {
    throw new Error("Unauthorized: invalid worker token");
  }
}

function normalizeCompact(input: Record<string, unknown>): AnamnesisCompactSummary {
  const summary = input as Partial<AnamnesisCompactSummary>;

  const id = coerceString(summary.id, crypto.randomUUID());
  const tenantId = coerceString(summary.tenantId, "unknown-tenant");
  const patientId = coerceString(summary.patientId, "unknown-patient");
  const consultationId = coerceString(summary.consultationId, "unknown-consultation");
  const professionalId = coerceString(summary.professionalId, "unknown-professional");
  const status = (summary.status as AnamnesisStatus | undefined) ?? "submitted";

  return {
    id,
    tenantId,
    consultationId,
    patientId,
    professionalId,
    status,
    completionRate: Number(summary.completionRate ?? 0),
    submittedAt: summary.submittedAt ? new Date(summary.submittedAt as string) : new Date(),
    steps: Array.isArray(summary.steps)
      ? summary.steps.map((step) => ({
          key: String((step as { key?: string }).key ?? "unknown-step"),
          completed: Boolean((step as { completed?: boolean }).completed ?? true),
          payload: (step as { payload?: Record<string, unknown> }).payload ?? {},
        }))
      : [],
    attachments: Array.isArray(summary.attachments)
      ? summary.attachments.map((attachment) => ({
          id: coerceString((attachment as { id?: string }).id, crypto.randomUUID()),
          fileName: coerceString((attachment as { fileName?: string }).fileName, "attachment"),
          stepNumber: Number((attachment as { stepNumber?: number }).stepNumber ?? 0),
        }))
      : [],
  };
}

function coerceString(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
}

async function generateProviderResult(
  cfg: WorkerConfig,
  job: AiWorkerRequestBody,
  compact: AnamnesisCompactSummary,
  started: number,
): Promise<ProviderResult> {
  if (cfg.provider === "local") {
    return generateLocally(cfg, job, compact, started);
  }
  return await generateViaOpenAI(cfg, job, compact, started);
}

function generateLocally(
  cfg: WorkerConfig,
  job: AiWorkerRequestBody,
  compact: AnamnesisCompactSummary,
  started: number,
): ProviderSuccessResult {
  const result = generateLocalPlan({
    request: job.payload,
    compact,
    rollupSummary: job.rollupSummary,
  });

  const latencyMs = Math.round(performance.now() - started);

  return {
    status: "completed",
    planText: result.planText,
    reasoningText: result.reasoningText,
    summary: buildSummary(result.summary, cfg.summaryMaxLength),
    recommendations: result.recommendations,
    riskFactors: result.riskFactors,
    evidenceMap: result.evidenceMap,
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
  };
}

async function generateViaOpenAI(
  cfg: WorkerConfig,
  job: AiWorkerRequestBody,
  compact: AnamnesisCompactSummary,
  started: number,
): Promise<ProviderResult> {
  const apiKey = cfg.openaiApiKey ?? "";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), cfg.requestTimeoutMs);

  const body = {
    model: cfg.openaiModel,
    temperature: cfg.openaiTemperature,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: resolveSystemPrompt(job) },
      { role: "user", content: resolveUserPrompt(job, compact) },
    ],
  };

  try {
    const response = await fetch(`${cfg.openaiBaseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const latencyMs = Math.round(performance.now() - started);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        status: "failed",
        errorMessage: `OpenAI responded with ${response.status}: ${errorText}`,
        latencyMs,
        model: cfg.openaiModel,
        payload: {
          provider: "openai",
          request: body,
        },
      };
    }

    const json = (await response.json()) as Record<string, unknown>;
    const choice = Array.isArray(json.choices) ? json.choices[0] as Record<string, unknown> : undefined;
    const message = choice && typeof choice === "object" ? (choice.message as Record<string, unknown> | undefined) : undefined;
    const content = message?.content;

    if (!content || typeof content !== "string") {
      return {
        status: "failed",
        errorMessage: "OpenAI response missing content",
        latencyMs,
        model: String(json.model ?? cfg.openaiModel),
        payload: {
          provider: "openai",
          request: body,
        },
        rawResponse: json,
      };
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      return {
        status: "failed",
        errorMessage: `Failed to parse OpenAI JSON: ${formatError(error)}`,
        latencyMs,
        model: String(json.model ?? cfg.openaiModel),
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

    const planText = String(parsed.plan_text ?? parsed.planText ?? "").trim();
    const reasoningText = String(parsed.reasoning_text ?? parsed.reasoningText ?? "").trim();
    const confidence = Number(parsed.confidence ?? 0.5);
    const evidenceRaw = Array.isArray(parsed.evidence_map)
      ? (parsed.evidence_map as Array<Record<string, unknown>>)
      : Array.isArray(parsed.evidenceMap)
      ? (parsed.evidenceMap as Array<Record<string, unknown>>)
      : [];

    const recommendations = buildRecommendations(planText);
    const riskFactors = buildRiskFactors(evidenceRaw);

    const usage = (json.usage ?? {}) as Record<string, unknown>;

    return {
      status: "completed",
      planText,
      reasoningText,
      summary: buildSummary(reasoningText || planText, cfg.summaryMaxLength),
      recommendations,
      riskFactors,
      evidenceMap: evidenceRaw,
      confidence: Number.isFinite(confidence) ? confidence : 0.5,
      tokensInput: Number(usage.prompt_tokens ?? usage.promptTokens ?? undefined),
      tokensOutput: Number(usage.completion_tokens ?? usage.completionTokens ?? undefined),
      latencyMs,
      model: String(json.model ?? cfg.openaiModel),
      therapeuticPlan: {
        planText,
        reasoningText,
        recommendations,
        riskFactors,
      },
      payload: {
        provider: "openai",
        requestId: crypto.randomUUID(),
        request: body,
      },
      rawResponse: json,
    };
  } catch (error) {
    return {
      status: "failed",
      errorMessage: `OpenAI request failed: ${formatError(error)}`,
      latencyMs: Math.round(performance.now() - started),
      model: cfg.openaiModel,
      payload: {
        provider: "openai",
        request: body,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function buildHmacSignature(secret: string, timestamp: string, body: string): Promise<string> {
  const payload = `${timestamp}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function postResultToBackend(
  cfg: WorkerConfig,
  job: AiWorkerRequestBody,
  result: ProviderResult,
): Promise<void> {
  const overrideBase =
    typeof job.metadata === "object" &&
    job.metadata !== null &&
    typeof (job.metadata as Record<string, unknown>).webhookBaseUrl === "string"
      ? String((job.metadata as Record<string, unknown>).webhookBaseUrl)
      : undefined;
  const webhookBase = (overrideBase ?? cfg.webhookBaseUrl).replace(/\/$/, "");
  const url = `${webhookBase}/anamneses/${job.anamnesisId}/ai-result`;
  const overrideSecret =
    typeof job.metadata === "object" &&
    job.metadata !== null &&
    typeof (job.metadata as Record<string, unknown>).webhookSecret === "string"
      ? String((job.metadata as Record<string, unknown>).webhookSecret)
      : undefined;
  const secret = overrideSecret ?? cfg.webhookSecret;

  const respondedAt = new Date().toISOString();
  const body = buildWebhookBody(job, result, respondedAt);
  const bodyJson = JSON.stringify(body);

  const timestamp = Date.now().toString();
  const signature = await buildHmacSignature(secret, timestamp, bodyJson);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-anamnesis-ai-timestamp": timestamp,
    "x-anamnesis-ai-signature": `sha256=${signature}`,
  };

  if (cfg.tenantHeaderEnabled) {
    headers["x-tenant-id"] = job.tenantId;
  }

  if (cfg.workerToken) {
    headers["x-worker-token"] = cfg.workerToken;
  }

  for (let attempt = 1; attempt <= cfg.maxRetries; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: bodyJson,
      });

      if (response.ok) {
        return;
      }

      const errorText = await response.text().catch(() => "");
      throw new Error(`Webhook responded with status ${response.status}: ${errorText}`);
    } catch (error) {
      if (attempt >= cfg.maxRetries) {
        throw error;
      }
      const delay = 1000 * attempt;
      await sleep(delay);
    }
  }
}

function buildWebhookBody(
  job: AiWorkerRequestBody,
  result: ProviderResult,
  respondedAt: string,
): Record<string, unknown> {
  const base: Record<string, unknown> = {
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
  };

  if (result.status === "completed") {
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

function resolveSystemPrompt(job: AiWorkerRequestBody): string {
  if (typeof job.systemPrompt === "string" && job.systemPrompt.trim().length > 0) {
    return job.systemPrompt.trim();
  }

  const metadata = job.metadata ?? {};
  const candidate =
    typeof metadata === "object" && metadata && typeof metadata.systemPrompt === "string"
      ? metadata.systemPrompt
      : undefined;

  if (candidate && candidate.trim().length > 0) {
    return candidate.trim();
  }

  return "Você é um agente clínico assistivo. Responda exclusivamente em JSON com campos plan_text, reasoning_text, evidence_map e confidence.";
}

function resolveUserPrompt(job: AiWorkerRequestBody, compact: AnamnesisCompactSummary): string {
  if (typeof job.userPrompt === "string" && job.userPrompt.trim().length > 0) {
    return job.userPrompt.trim();
  }

  const metadata = job.metadata ?? {};
  const candidate =
    typeof metadata === "object" && metadata && typeof metadata.userPrompt === "string"
      ? metadata.userPrompt
      : undefined;

  if (candidate && candidate.trim().length > 0) {
    return candidate.trim();
  }

  return [
    "Considere o resumo acumulado do paciente e a anamnese compacta atual.",
    "Responda em JSON com os campos plan_text, reasoning_text, evidence_map e confidence.",
    JSON.stringify({ rollupSummary: job.rollupSummary, compact }, null, 2),
  ].join("\n");
}

function buildRecommendations(planText: string): TherapeuticPlanRecommendation[] {
  if (!planText.trim()) {
    return [];
  }

  return planText
    .split(/\n+/)
    .map((line) => removeLeadingMarker(line))
    .filter((line) => line.length > 0)
    .slice(0, 8)
    .map((description) => ({
      id: crypto.randomUUID(),
      description,
      priority: description.toLowerCase().includes("urgente") ? "high" : "medium",
    }));
}

function buildRiskFactors(evidenceMap: Array<Record<string, unknown>>): TherapeuticPlanRiskFactor[] {
  const bucket = new Map<string, TherapeuticPlanRiskFactor>();

  evidenceMap.forEach((entry) => {
    const evidences = Array.isArray(entry.evidence) ? entry.evidence as unknown[] : [];
    evidences
      .map((value) => String(value ?? "").trim())
      .filter((value) => value.length > 0)
      .slice(0, 5)
      .forEach((value) => {
        if (bucket.size >= 8) {
          return;
        }
        if (!bucket.has(value)) {
          bucket.set(value, {
            id: crypto.randomUUID(),
            description: value,
            severity: value.toLowerCase().includes("grave") ? "high" : "medium",
          });
        }
      });
  });

  return Array.from(bucket.values());
}

function buildSummary(text: string, maxLength: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, Math.max(0, maxLength - 1))}.`;
}

function removeLeadingMarker(line: string): string {
  return line.replace(/^[0-9]+[).\-\s]*/, "").trim();
}

interface LocalPlanParams {
  request: AnamnesisAIRequestPayload;
  compact: AnamnesisCompactSummary;
  rollupSummary: string;
}

interface LocalPlanResult {
  planText: string;
  reasoningText: string;
  summary: string;
  recommendations: TherapeuticPlanRecommendation[];
  riskFactors: TherapeuticPlanRiskFactor[];
  evidenceMap: Array<{ recommendation: string; evidence: string[]; confidence: number }>;
  confidence: number;
  tokensIn: number;
  tokensOut: number;
  model: string;
}

function generateLocalPlan(params: LocalPlanParams): LocalPlanResult {
  const { request, compact, rollupSummary } = params;
  const chiefComplaint = extractChiefComplaint(request);
  const medications = extractMedicationHistory(request);
  const relevantFindings = extractRelevantFindings(request);
  const summaryPieces: string[] = [];

  if (chiefComplaint) {
    summaryPieces.push(`Queixa principal: ${chiefComplaint}`);
  }

  if (relevantFindings.length) {
    summaryPieces.push(`Achados: ${relevantFindings.join("; ")}`);
  }

  if (medications.length) {
    summaryPieces.push(`Medicacoes em uso: ${medications.join("; ")}`);
  }

  const recommendations = buildLocalRecommendations(summaryPieces, rollupSummary);
  const planText = composePlanText(recommendations);
  const reasoningText = composeReasoningText(recommendations, rollupSummary);
  const evidenceMap = composeEvidence(recommendations, summaryPieces, rollupSummary);
  const riskFactors = buildLocalRiskFactors(relevantFindings);

  const rawInputLength = JSON.stringify(request).length + JSON.stringify(compact).length;
  const rawOutputLength = planText.length + reasoningText.length;

  return {
    planText,
    reasoningText,
    summary: summaryPieces.join(" | ") || "Conduta baseada nos relatos atuais.",
    recommendations,
    riskFactors,
    evidenceMap,
    confidence: 0.62,
    tokensIn: Math.max(50, Math.ceil(rawInputLength / 4)),
    tokensOut: Math.max(120, Math.ceil(rawOutputLength / 4)),
    model: "local-rule-engine-v1",
  };
}

function extractChiefComplaint(request: AnamnesisAIRequestPayload): string | undefined {
  const node = getStepPayload(request, "chiefComplaint");
  if (!node || typeof node !== "object") {
    return undefined;
  }
  const description = toSentence((node as Record<string, unknown>)["description"]);
  const duration = toSentence((node as Record<string, unknown>)["duration"]);
  if (description && duration) {
    return `${description} (há ${duration})`;
  }
  return description ?? duration ?? undefined;
}

function extractMedicationHistory(request: AnamnesisAIRequestPayload): string[] {
  const node = getStepPayload(request, "medications");
  if (!node || typeof node !== "object") {
    return [];
  }
  const list = (node as Record<string, unknown>)["current"];
  if (Array.isArray(list)) {
    return list
      .map((entry) => toSentence(entry))
      .filter((entry): entry is string => Boolean(entry));
  }
  return [];
}

function extractRelevantFindings(request: AnamnesisAIRequestPayload): string[] {
  const node = getStepPayload(request, "physicalExam") as Record<string, unknown> | undefined;
  const findings: string[] = [];

  if (!node) {
    return findings;
  }

  const observations = node["observations"];
  if (Array.isArray(observations)) {
    observations
      .map((entry) => toSentence(entry))
      .filter((entry): entry is string => Boolean(entry))
      .forEach((entry) => findings.push(entry));
  }

  const anthropometry = node["anthropometry"] as Record<string, unknown> | undefined;
  if (anthropometry) {
    const weight = toSentence(anthropometry["weightKg"] ?? anthropometry["weight"]);
    const height = toSentence(anthropometry["heightCm"] ?? anthropometry["height"]);
    const bmi = toSentence(anthropometry["bmi"]);
    if (weight) findings.push(`Peso ${weight}`);
    if (height) findings.push(`Altura ${height}`);
    if (bmi) findings.push(`IMC ${bmi}`);
  }

  return findings.slice(0, 3);
}

function buildLocalRecommendations(
  details: string[],
  rollupSummary: string,
): TherapeuticPlanRecommendation[] {
  const recommendations: TherapeuticPlanRecommendation[] = [];
  if (details.length) {
    recommendations.push({
      id: crypto.randomUUID(),
      description: `Reavaliar achados relatados: ${details.join("; ")}`,
      priority: "medium",
    });
  }

  if (rollupSummary.trim().length > 0) {
    recommendations.push({
      id: crypto.randomUUID(),
      description: "Comparar evolucao com resumo acumulado do paciente.",
      priority: "low",
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      id: crypto.randomUUID(),
      description: "Manter acompanhamento clinico e revisar habitos saudaveis.",
      priority: "low",
    });
  }

  return recommendations;
}

function buildLocalRiskFactors(findings: string[]): TherapeuticPlanRiskFactor[] {
  if (!findings.length) {
    return [];
  }
  return findings.slice(0, 3).map((finding) => ({
    id: crypto.randomUUID(),
    description: finding,
    severity: "medium",
  }));
}

function composePlanText(recommendations: TherapeuticPlanRecommendation[]): string {
  return recommendations.map((rec, index) => `${index + 1}) ${rec.description}`).join("\n");
}

function composeReasoningText(
  recommendations: TherapeuticPlanRecommendation[],
  rollupSummary: string,
): string {
  const reasoning: string[] = recommendations.map((rec) => `- ${rec.description}.`);
  if (rollupSummary.trim().length > 0) {
    reasoning.push("- Considerar tendencias descritas no resumo acumulado.");
  }
  reasoning.push("- Recomendar revisita em caso de novos sinais ou agravamento dos sintomas.");
  return reasoning.join("\n");
}

function composeEvidence(
  recommendations: TherapeuticPlanRecommendation[],
  details: string[],
  rollupSummary: string,
): Array<{ recommendation: string; evidence: string[]; confidence: number }> {
  return recommendations.map((rec) => {
    const evidence: string[] = [];
    evidence.push(...details.slice(0, 3));
    if (rollupSummary.trim().length > 0) {
      evidence.push("Resumo acumulado do paciente");
    }
    return {
      recommendation: rec.description,
      evidence,
      confidence: 0.6,
    };
  });
}

function getStepPayload(
  request: AnamnesisAIRequestPayload,
  key: string,
): unknown {
  return request.steps?.[key];
}

function toSentence(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => toSentence(entry))
      .filter((entry): entry is string => Boolean(entry))
      .join(", ");
  }
  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return typeof error === "string" ? error : "unknown-error";
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
