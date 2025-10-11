import { z } from 'zod';

const providerEnum = z.enum(['openai', 'local']);

const configSchema = z.object({
  port: z.coerce.number().int().positive().default(3333),
  workerToken: z.string().optional(),
  provider: providerEnum.default('openai'),
  webhookBaseUrl: z.string().url(),
  webhookSecret: z.string().min(1),
  tenantHeaderEnabled: z.boolean().default(true),
  openaiApiKey: z.string().optional(),
  openaiModel: z.string().default('gpt-4o-mini'),
  openaiBaseUrl: z.string().url().default('https://api.openai.com/v1'),
  openaiTemperature: z.coerce.number().min(0).max(2).default(0.2),
  maxRetries: z.coerce.number().int().min(0).max(5).default(3),
  requestTimeoutMs: z.coerce.number().int().positive().default(20000),
  summaryMaxLength: z.coerce.number().int().positive().default(600),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type WorkerConfig = z.infer<typeof configSchema>;

export function loadConfig(): WorkerConfig {
  const parsed = configSchema.safeParse({
    port: process.env.ANAMNESIS_AI_WORKER_PORT,
    workerToken: process.env.ANAMNESIS_AI_WORKER_TOKEN,
    provider: process.env.ANAMNESIS_AI_PROVIDER,
    webhookBaseUrl: process.env.ANAMNESIS_AI_WEBHOOK_BASE_URL,
    webhookSecret: process.env.ANAMNESIS_AI_WEBHOOK_SECRET,
    tenantHeaderEnabled: process.env.ANAMNESIS_AI_WEBHOOK_INCLUDE_TENANT?.toLowerCase() !== 'false',
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL,
    openaiBaseUrl: process.env.OPENAI_BASE_URL,
    openaiTemperature: process.env.OPENAI_TEMPERATURE,
    maxRetries: process.env.ANAMNESIS_AI_WORKER_MAX_RETRIES,
    requestTimeoutMs: process.env.ANAMNESIS_AI_WORKER_TIMEOUT_MS,
    summaryMaxLength: process.env.ANAMNESIS_AI_WORKER_SUMMARY_MAX_LEN,
    logLevel: process.env.ANAMNESIS_AI_WORKER_LOG_LEVEL,
  });

  if (!parsed.success) {
    const formatted = parsed.error.format();
    const readable = JSON.stringify(formatted, null, 2);
    throw new Error(`Invalid anamnesis AI worker configuration: ${readable}`);
  }

  const config = parsed.data;

  if (config.provider === 'openai' && !config.openaiApiKey) {
    throw new Error('OPENAI_API_KEY must be provided when ANAMNESIS_AI_PROVIDER=openai');
  }

  return config;
}
