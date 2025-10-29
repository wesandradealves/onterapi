import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { AnamnesisAIWebhookGuard } from '@modules/anamnesis/guards/anamnesis-ai-webhook.guard';
import { AnamnesisAIWebhookReplayService } from '@modules/anamnesis/services/anamnesis-ai-webhook-replay.service';
import { buildHmacSignature, formatSignature } from '@shared/utils/hmac.util';

const MOCK_SECRET = 'test-secret';
const FIXED_NOW = 1_700_000_000_000;

describe('AnamnesisAIWebhookGuard', () => {
  let guard: AnamnesisAIWebhookGuard;
  let configGet: jest.Mock;
  let replayService: jest.Mocked<AnamnesisAIWebhookReplayService>;

  beforeEach(() => {
    configGet = jest.fn((key: string) => {
      if (key === 'ANAMNESIS_AI_WEBHOOK_SECRET') {
        return MOCK_SECRET;
      }
      return undefined;
    });

    replayService = {
      registerRequest: jest.fn().mockResolvedValue(true),
      pruneBefore: jest.fn().mockResolvedValue(0),
    } as unknown as jest.Mocked<AnamnesisAIWebhookReplayService>;

    guard = new AnamnesisAIWebhookGuard({ get: configGet } as unknown as any, replayService);
    jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should authorize request with valid signature', async () => {
    const body = { analysisId: 'abc', status: 'completed' };
    const timestamp = `${FIXED_NOW}`;
    const signature = signPayload(timestamp, body);
    const context = buildContext({
      headers: {
        'x-anamnesis-ai-timestamp': timestamp,
        'x-anamnesis-ai-signature': signature,
        'x-tenant-id': 'tenant-valid',
      },
      body,
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(replayService.registerRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-valid',
        analysisId: 'abc',
        signature: signature.replace('sha256=', ''),
      }),
    );
  });

  it('should reject when signature does not match body', async () => {
    const timestamp = `${FIXED_NOW}`;
    const signature = signPayload(timestamp, { foo: 'bar' });
    const context = buildContext({
      headers: {
        'x-anamnesis-ai-timestamp': timestamp,
        'x-anamnesis-ai-signature': signature,
        'x-tenant-id': 'tenant-invalid-body',
      },
      body: { foo: 'tampered' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(replayService.registerRequest).not.toHaveBeenCalled();
  });

  it('should reject when signature is replayed', async () => {
    replayService.registerRequest.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const body = { analysisId: 'abc', status: 'completed' };
    const timestamp = `${FIXED_NOW}`;
    const signature = signPayload(timestamp, body);
    const context = buildContext({
      headers: {
        'x-anamnesis-ai-timestamp': timestamp,
        'x-anamnesis-ai-signature': signature,
        'x-tenant-id': 'tenant-replay',
      },
      body,
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should reject when timestamp is outside skew window', async () => {
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
        'x-tenant-id': 'tenant-old',
      },
      body: { foo: 'bar' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(replayService.registerRequest).not.toHaveBeenCalled();
  });
});

function signPayload(timestamp: string, body: unknown): string {
  const digest = buildHmacSignature({
    secret: MOCK_SECRET,
    timestamp,
    body: JSON.stringify(body ?? {}),
  });
  return formatSignature(digest);
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
