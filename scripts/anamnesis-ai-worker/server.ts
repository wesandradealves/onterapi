/* eslint-disable no-console */
import express, { Request, Response } from 'express';

import {
  AnamnesisAIRequestPayload,
  AnamnesisCompactSummary,
} from '../../src/domain/anamnesis/types/anamnesis.types';
import { loadConfig } from './config';
import { buildSummary, normalizeCompact } from './helpers';
import { postResultToBackend } from './webhook';
import { generateProviderResult } from './provider';
import { AiWorkerRequestBody } from './types';

const config = loadConfig();
const app = express();
app.use(express.json({ limit: '1mb' }));

function log(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: unknown): void {
  const levels = ['debug', 'info', 'warn', 'error'];
  if (levels.indexOf(level) < levels.indexOf(config.logLevel)) {
    return;
  }

  const payload = meta ? ` ${JSON.stringify(meta)}` : '';
  const timestamp = new Date().toISOString();
  // eslint-disable-next-line no-console
  console[level](`[${timestamp}] [worker] [${level.toUpperCase()}] ${message}${payload}`);
}

app.post('/jobs/anamnesis-ai-request', async (req: Request, res: Response) => {
  try {
    assertAuthorized(req);
    const job = assertValidBody(req.body);
    const compact = normalizeCompact(job.compact);

    log('info', 'Job received', { analysisId: job.analysisId, tenantId: job.tenantId });

    const result = await generateProviderResult(config, job, compact as AnamnesisCompactSummary);
    await postResultToBackend(config, job, result);

    log('info', 'Job processed', {
      analysisId: job.analysisId,
      tenantId: job.tenantId,
      status: result.status,
      latencyMs: result.latencyMs,
    });

    res.status(202).json({ status: 'accepted' });
  } catch (error) {
    log('error', 'Job processing failed', {
      error: (error as Error).message,
    });
    res.status(500).json({
      status: 'error',
      message: (error as Error).message,
    });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', provider: config.provider });
});

app.listen(config.port, () => {
  log('info', `Anamnesis AI worker listening on port ${config.port}`);
});

function assertAuthorized(req: Request): void {
  if (!config.workerToken) {
    return;
  }

  const header = req.get('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    throw new Error('Unauthorized: missing bearer token');
  }

  const token = header.slice('Bearer '.length);
  if (token !== config.workerToken) {
    throw new Error('Unauthorized: invalid worker token');
  }
}

function assertValidBody(body: unknown): AiWorkerRequestBody {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid body payload');
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
  } = body as AiWorkerRequestBody;

  if (!analysisId || !anamnesisId || !tenantId || !promptVersion) {
    throw new Error('Missing required AI job fields');
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('Missing payload data');
  }

  if (!compact || typeof compact !== 'object') {
    throw new Error('Missing compact summary');
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
    rollupSummary: rollupSummary ?? '',
    metadata,
  };
}
