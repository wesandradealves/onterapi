import { ConfigService } from '@nestjs/config';

import { DomainEvent } from '../../../src/shared/events/domain-event.interface';
import { DomainEvents } from '../../../src/shared/events/domain-events';
import {
  AnamnesisAIRequestedEventPayload,
  AnamnesisAIRequestPayload,
  AnamnesisCompactSummary,
} from '../../../src/domain/anamnesis/types/anamnesis.types';
import { AnamnesisAIWorkerService } from '../../../src/modules/anamnesis/services/anamnesis-ai-worker.service';
import { MessageBus } from '../../../src/shared/messaging/message-bus';

const createEvent = (
  payload: AnamnesisAIRequestPayload,
): DomainEvent<AnamnesisAIRequestedEventPayload> => ({
  eventId: 'evt-1',
  eventName: DomainEvents.ANAMNESIS_AI_REQUESTED,
  aggregateId: payload.anamnesisId,
  occurredOn: new Date('2025-10-01T09:00:00Z'),
  payload: {
    anamnesisId: payload.anamnesisId,
    tenantId: payload.tenantId,
    analysisId: 'analysis-1',
    consultationId: payload.consultationId,
    patientId: payload.patientId,
    professionalId: payload.professionalId,
    payload,
    metadata: { correlationId: 'corr-1' },
  },
  metadata: { correlationId: 'corr-1' },
});

describe('AnamnesisAIWorkerService', () => {
  let messageBus: jest.Mocked<MessageBus>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    messageBus = {
      publish: jest.fn(),
      publishMany: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    } as unknown as jest.Mocked<MessageBus>;

    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;
  });

  const buildRequestPayload = (): AnamnesisAIRequestPayload => ({
    tenantId: 'tenant-1',
    anamnesisId: 'anam-1',
    consultationId: 'consult-1',
    professionalId: 'prof-1',
    patientId: 'patient-1',
    status: 'submitted',
    submittedAt: new Date('2025-10-01T08:30:00Z'),
    steps: {
      chiefComplaint: { description: 'Cefaleia tensional diaria' },
    } as Record<string, Record<string, unknown>>,
    attachments: [],
    patientProfile: {
      id: 'patient-1',
      fullName: 'Paciente Teste',
    },
    metadata: {
      completionRate: 85,
    },
  });

  it('should skip dispatch when endpoint is not configured', async () => {
    configService.get.mockReturnValue(undefined);
    const service = new AnamnesisAIWorkerService(messageBus, configService);
    const requestPayload = buildRequestPayload();
    const event = createEvent(requestPayload);

    const postSpy = jest.spyOn(
      service as unknown as { postToWorker: unknown },
      'postToWorker' as never,
    );

    await service.handleAIRequested(event);

    expect(configService.get).toHaveBeenCalledWith('ANAMNESIS_AI_WORKER_URL');
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('should dispatch job to worker with prompt and compact summary', async () => {
    const compact: AnamnesisCompactSummary = {
      id: 'anam-1',
      tenantId: 'tenant-1',
      consultationId: 'consult-1',
      patientId: 'patient-1',
      professionalId: 'prof-1',
      status: 'submitted',
      submittedAt: new Date('2025-10-01T08:30:00Z'),
      completionRate: 85,
      steps: [
        {
          key: 'chiefComplaint',
          completed: true,
          payload: { description: 'Cefaleia tensional diaria' },
        },
      ],
    };

    configService.get.mockImplementation((key: string) => {
      switch (key) {
        case 'ANAMNESIS_AI_WORKER_URL':
          return 'https://worker.example.com/jobs';
        case 'ANAMNESIS_AI_PROMPT_VERSION':
          return 'v2.0-test';
        case 'ANAMNESIS_AI_WORKER_TOKEN':
          return 'secret-token';
        case 'ANAMNESIS_AI_WORKER_TIMEOUT_MS':
          return '5000';
        default:
          return undefined;
      }
    });

    const service = new AnamnesisAIWorkerService(messageBus, configService);
    const requestPayload = buildRequestPayload();
    requestPayload.metadata = {
      ...requestPayload.metadata,
      compactAnamnesis: compact,
    };
    const event = createEvent(requestPayload);

    const postSpy = jest
      .spyOn(
        service as unknown as { postToWorker: (...args: unknown[]) => Promise<void> },
        'postToWorker' as never,
      )
      .mockResolvedValue(undefined);

    await service.handleAIRequested(event);

    expect(postSpy).toHaveBeenCalledTimes(1);
    const [endpoint, body, token, timeoutMs] = postSpy.mock.calls[0];

    expect(endpoint).toBe('https://worker.example.com/jobs');
    expect(token).toBe('secret-token');
    expect(timeoutMs).toBe(5000);
    expect(body.analysisId).toBe('analysis-1');
    expect(body.anamnesisId).toBe('anam-1');
    expect(body.tenantId).toBe('tenant-1');
    expect(body.promptVersion).toBe('v2.0-test');
    expect(body.rollupSummary).toBe('Sem resumo anterior disponivel.');
    expect(body.compact.visit).toMatchObject({
      anamnesisId: 'anam-1',
      consultationId: 'consult-1',
      status: 'submitted',
    });
    expect(body.compact.steps).toEqual([
      {
        key: 'chiefComplaint',
        completed: true,
        payload: { description: 'Cefaleia tensional diaria' },
      },
    ]);
    expect(typeof (body as { systemPrompt: string }).systemPrompt).toBe('string');
    expect(typeof (body as { userPrompt: string }).userPrompt).toBe('string');
  });
});
