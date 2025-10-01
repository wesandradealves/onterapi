import { createHmac } from 'node:crypto';

import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { AnamnesisAIWebhookGuard } from '@modules/anamnesis/guards/anamnesis-ai-webhook.guard';

const MOCK_SECRET = 'test-secret';
const FIXED_NOW = 1_700_000_000_000;

describe('AnamnesisAIWebhookGuard', () => {
  let guard: AnamnesisAIWebhookGuard;
  let configGet: jest.Mock;

  beforeEach(() => {
    configGet = jest.fn((key: string) => {
      if (key === 'ANAMNESIS_AI_WEBHOOK_SECRET') {
        return MOCK_SECRET;
      }
      return undefined;
    });

    guard = new AnamnesisAIWebhookGuard({ get: configGet } as unknown as any);
    jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should authorize request with valid signature', () => {
    const body = { analysisId: 'abc', status: 'completed' };
    const timestamp = `${FIXED_NOW}`;
    const signature = signPayload(timestamp, body);
    const context = buildContext({
      headers: {
        'x-anamnesis-ai-timestamp': timestamp,
        'x-anamnesis-ai-signature': signature,
      },
      body,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should reject when signature does not match body', () => {
    const timestamp = `${FIXED_NOW}`;
    const signature = signPayload(timestamp, { foo: 'bar' });
    const context = buildContext({
      headers: {
        'x-anamnesis-ai-timestamp': timestamp,
        'x-anamnesis-ai-signature': signature,
      },
      body: { foo: 'tampered' },
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should reject when timestamp is outside skew window', () => {
    configGet.mockImplementation((key: string) => {
      if (key === 'ANAMNESIS_AI_WEBHOOK_SECRET') {
        return MOCK_SECRET;
      }
      if (key === 'ANAMNESIS_AI_WEBHOOK_MAX_SKEW_MS') {
        return 1000; // 1 segundo
      }
      return undefined;
    });

    const oldTimestamp = `${FIXED_NOW - 5000}`;
    const signature = signPayload(oldTimestamp, { foo: 'bar' });
    const context = buildContext({
      headers: {
        'x-anamnesis-ai-timestamp': oldTimestamp,
        'x-anamnesis-ai-signature': signature,
      },
      body: { foo: 'bar' },
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});

function signPayload(timestamp: string, body: unknown): string {
  const payload = `${timestamp}.${JSON.stringify(body ?? {})}`;
  const digest = createHmac('sha256', MOCK_SECRET).update(payload).digest('hex');
  return `sha256=${digest}`;
}

function buildContext({
  headers,
  body,
}: {
  headers: Record<string, string>;
  body?: unknown;
}): ExecutionContext {
  const request = { headers, body };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}
