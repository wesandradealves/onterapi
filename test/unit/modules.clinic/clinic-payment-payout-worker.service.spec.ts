import { ConfigService } from '@nestjs/config';

import { ClinicPaymentPayoutWorkerService } from '../../../src/modules/clinic/services/clinic-payment-payout-worker.service';
import { ClinicPaymentPayoutRequest } from '../../../src/domain/clinic/types/clinic.types';
import { IClinicPaymentPayoutRequestRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-payment-payout-request.repository.interface';
import {
  ExecuteClinicPaymentPayoutResult,
  IClinicPaymentGatewayService,
} from '../../../src/domain/clinic/interfaces/services/clinic-payment-gateway.service.interface';
import { IClinicPaymentCredentialsService } from '../../../src/domain/clinic/interfaces/services/clinic-payment-credentials.service.interface';
import { ClinicAuditService } from '../../../src/infrastructure/clinic/services/clinic-audit.service';

const buildRequest = (
  overrides: Partial<ClinicPaymentPayoutRequest> = {},
): ClinicPaymentPayoutRequest => ({
  id: 'payout-1',
  appointmentId: 'appointment-1',
  tenantId: 'tenant-1',
  clinicId: 'clinic-1',
  professionalId: 'professional-1',
  originalProfessionalId: null,
  coverageId: null,
  patientId: 'patient-1',
  holdId: 'hold-1',
  serviceTypeId: 'service-1',
  paymentTransactionId: 'txn-1',
  provider: 'asaas',
  credentialsId: 'cred-1',
  sandboxMode: false,
  bankAccountId: 'bank-1',
  settledAt: new Date('2025-10-15T12:00:00Z'),
  baseAmountCents: 20000,
  netAmountCents: 18000,
  remainderCents: 0,
  split: [
    { recipient: 'clinic', percentage: 60, amountCents: 12000 },
    { recipient: 'professional', percentage: 40, amountCents: 8000 },
  ],
  currency: 'BRL',
  gatewayStatus: 'RECEIVED_IN_ADVANCE',
  eventType: 'PAYMENT_CONFIRMED',
  fingerprint: 'fp-1',
  payloadId: 'payload-1',
  sandbox: false,
  status: 'processing',
  attempts: 1,
  lastError: null,
  requestedAt: new Date('2025-10-15T10:00:00Z'),
  lastAttemptedAt: new Date('2025-10-15T12:05:00Z'),
  processedAt: null,
  createdAt: new Date('2025-10-15T09:00:00Z'),
  updatedAt: new Date('2025-10-15T12:05:00Z'),
  ...overrides,
});

describe('ClinicPaymentPayoutWorkerService', () => {
  let configService: jest.Mocked<ConfigService>;
  let payoutRepository: jest.Mocked<IClinicPaymentPayoutRequestRepository>;
  let credentialsService: jest.Mocked<IClinicPaymentCredentialsService>;
  let paymentGatewayService: jest.Mocked<IClinicPaymentGatewayService>;
  let auditService: jest.Mocked<ClinicAuditService>;
  let worker: ClinicPaymentPayoutWorkerService;

  beforeEach(() => {
    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    const configMap: Record<string, unknown> = {
      CLINIC_PAYOUT_WORKER_ENABLED: true,
      CLINIC_PAYOUT_WORKER_INTERVAL_MS: 60000,
      CLINIC_PAYOUT_WORKER_BATCH_SIZE: 5,
      CLINIC_PAYOUT_WORKER_MAX_ATTEMPTS: 3,
      CLINIC_PAYOUT_WORKER_RETRY_AFTER_MS: 60000,
      CLINIC_PAYOUT_WORKER_STUCK_AFTER_MS: 300000,
    };

    configService.get.mockImplementation((key: string, defaultValue?: unknown) => {
      if (key in configMap) {
        return configMap[key];
      }
      return defaultValue as unknown;
    });

    payoutRepository = {
      enqueue: jest.fn(),
      leasePending: jest.fn(),
      existsByFingerprint: jest.fn(),
      existsByTransaction: jest.fn(),
      updateStatus: jest.fn(),
    } as unknown as jest.Mocked<IClinicPaymentPayoutRequestRepository>;

    credentialsService = {
      resolveCredentials: jest.fn().mockResolvedValue({
        provider: 'asaas',
        productionApiKey: 'prod-key',
        sandboxApiKey: 'sandbox-key',
      }),
    } as unknown as jest.Mocked<IClinicPaymentCredentialsService>;

    paymentGatewayService = {
      verifyPayment: jest.fn(),
      executePayout: jest.fn(),
    } as unknown as jest.Mocked<IClinicPaymentGatewayService>;

    auditService = {
      register: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ClinicAuditService>;

    worker = new ClinicPaymentPayoutWorkerService(
      configService,
      payoutRepository,
      credentialsService,
      paymentGatewayService,
      auditService,
    );
  });

  it('executa payout via gateway e registra auditoria', async () => {
    const request = buildRequest();
    const gatewayResponse: ExecuteClinicPaymentPayoutResult = {
      payoutId: 'asaas-transfer-1',
      status: 'processing',
      executedAt: undefined,
      providerResponse: { status: 'PENDING' },
    };

    paymentGatewayService.executePayout.mockResolvedValueOnce(gatewayResponse);

    await (
      worker as unknown as { processRequest: (req: ClinicPaymentPayoutRequest) => Promise<void> }
    ).processRequest(request);

    expect(credentialsService.resolveCredentials).toHaveBeenCalledWith({
      credentialsId: request.credentialsId,
      clinicId: request.clinicId,
      tenantId: request.tenantId,
    });

    expect(paymentGatewayService.executePayout).toHaveBeenCalledWith(
      expect.objectContaining({
        bankAccountId: request.bankAccountId,
        amountCents: 12000,
        externalReference: request.id,
        provider: 'asaas',
        sandboxMode: request.sandboxMode,
      }),
    );

    expect(payoutRepository.updateStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        payoutId: request.id,
        status: 'processing',
        processedAt: null,
        lastError: null,
        providerPayoutId: 'asaas-transfer-1',
        providerStatus: 'processing',
        providerPayload: gatewayResponse.providerResponse,
        executedAt: null,
      }),
    );

    expect(auditService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'clinic.payment.payout_processed',
        clinicId: request.clinicId,
        detail: expect.objectContaining({
          providerPayoutId: 'asaas-transfer-1',
          providerStatus: 'processing',
        }),
      }),
    );
  });

  it('marca payout como falho quando ocorre erro', async () => {
    const request = buildRequest();
    const failure = new Error('Credenciais invalidas');
    credentialsService.resolveCredentials.mockRejectedValueOnce(failure);

    await (
      worker as unknown as { processRequest: (req: ClinicPaymentPayoutRequest) => Promise<void> }
    ).processRequest(request);

    expect(payoutRepository.updateStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        payoutId: request.id,
        status: 'failed',
        lastError: expect.stringContaining('Credenciais invalidas'),
        attempts: request.attempts,
        providerStatus: 'failed',
      }),
    );

    expect(auditService.register).not.toHaveBeenCalled();
    expect(paymentGatewayService.executePayout).not.toHaveBeenCalled();
  });
});
