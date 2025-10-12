import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import {
  IProcessClinicPaymentWebhookUseCase,
  IProcessClinicPaymentWebhookUseCase as IProcessClinicPaymentWebhookUseCaseToken,
} from '../../../src/domain/clinic/interfaces/use-cases/process-clinic-payment-webhook.use-case.interface';
import { ClinicPaymentWebhookController } from '../../../src/modules/clinic/api/controllers/clinic-payment-webhook.controller';
import { ClinicAsaasWebhookGuard } from '../../../src/modules/clinic/guards/clinic-asaas-webhook.guard';
import { buildHmacSignature } from '../../../src/shared/utils/hmac.util';

describe('ClinicPaymentWebhookController (integration)', () => {
  let app: INestApplication;
  let processWebhookUseCase: jest.Mocked<IProcessClinicPaymentWebhookUseCase>;
  const token = 'test-token';
  const secret = 'hmac-secret';

  beforeEach(async () => {
    processWebhookUseCase = {
      execute: jest.fn(),
      executeOrThrow: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IProcessClinicPaymentWebhookUseCase>;

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ClinicPaymentWebhookController],
      providers: [
        ClinicAsaasWebhookGuard,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'CLINIC_ASAAS_WEBHOOK_SECRET') {
                return secret;
              }
              if (key === 'CLINIC_ASAAS_WEBHOOK_TOKEN') {
                return token;
              }
              return undefined;
            }),
          },
        },
        { provide: IProcessClinicPaymentWebhookUseCaseToken, useValue: processWebhookUseCase },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('aceita webhook assinado e encaminha para o caso de uso', async () => {
    const payload = {
      event: 'PAYMENT_CONFIRMED',
      payment: {
        id: 'pay-abc',
        status: 'CONFIRMED',
      },
    };

    const timestamp = Date.now().toString();
    const signature = buildHmacSignature({
      secret,
      timestamp,
      body: JSON.stringify(payload),
    });

    await request(app.getHttpServer())
      .post('/integrations/asaas/webhook')
      .set('x-asaas-timestamp', timestamp)
      .set('x-asaas-signature', `sha256=${signature}`)
      .send(payload)
      .expect(202);

    expect(processWebhookUseCase.executeOrThrow).toHaveBeenCalledTimes(1);
    const [input] = processWebhookUseCase.executeOrThrow.mock.calls[0];

    expect(input.provider).toBe('asaas');
    expect(input.payload).toEqual(payload);
    expect(input.receivedAt).toBeInstanceOf(Date);
    expect(input.receivedAt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('rejeita quando a assinatura for invalida', async () => {
    const payload = { event: 'PAYMENT_CONFIRMED', payment: { id: 'pay-xyz' } };

    await request(app.getHttpServer())
      .post('/integrations/asaas/webhook')
      .set('x-asaas-timestamp', Date.now().toString())
      .set('x-asaas-signature', 'sha256=assinatura-invalida')
      .send(payload)
      .expect(401);

    expect(processWebhookUseCase.executeOrThrow).not.toHaveBeenCalled();
  });

  it('aceita token legacy quando segredo nao estiver configurado', async () => {
    (app.get<ConfigService>(ConfigService).get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'CLINIC_ASAAS_WEBHOOK_SECRET') {
        return undefined;
      }
      if (key === 'CLINIC_ASAAS_WEBHOOK_TOKEN') {
        return token;
      }
      return undefined;
    });

    const payload = { event: 'PAYMENT_CONFIRMED', payment: { id: 'pay-legacy' } };

    await request(app.getHttpServer())
      .post('/integrations/asaas/webhook')
      .set('x-asaas-token', token)
      .send(payload)
      .expect(202);

    expect(processWebhookUseCase.executeOrThrow).toHaveBeenCalledTimes(1);
  });
});
