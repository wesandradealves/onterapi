import { ClinicPaymentNotificationService } from '../../../src/modules/clinic/services/clinic-payment-notification.service';
import {
  ClinicAppointment,
  ClinicPaymentLedgerChargeback,
  ClinicPaymentLedgerRefund,
  ClinicPaymentLedgerSettlement,
} from '../../../src/domain/clinic/types/clinic.types';
import {
  ClinicPaymentChargebackEvent,
  ClinicPaymentRefundedEvent,
  ClinicPaymentSettledEvent,
} from '../../../src/modules/clinic/services/clinic-payment-event.types';
import { DomainEvents } from '../../../src/shared/events/domain-events';
import { IClinicRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic.repository.interface';
import { IEmailService } from '../../../src/domain/auth/interfaces/services/email.service.interface';
import { IWhatsAppService } from '../../../src/domain/integrations/interfaces/services/whatsapp.service.interface';
import { MessageBus } from '../../../src/shared/messaging/message-bus';
import { ClinicNotificationContextService } from '../../../src/modules/clinic/services/clinic-notification-context.service';

type Mocked<T> = jest.Mocked<T>;

const createAppointment = (): ClinicAppointment => ({
  id: 'appointment-1',
  clinicId: 'clinic-1',
  tenantId: 'tenant-1',
  holdId: 'hold-1',
  professionalId: 'professional-1',
  patientId: 'patient-1',
  serviceTypeId: 'service-1',
  start: new Date('2099-01-01T10:00:00Z'),
  end: new Date('2099-01-01T11:00:00Z'),
  status: 'scheduled',
  paymentStatus: 'settled',
  paymentTransactionId: 'trx-1',
  confirmedAt: new Date('2099-01-01T09:00:00Z'),
  createdAt: new Date('2099-01-01T08:00:00Z'),
  updatedAt: new Date('2099-01-01T08:00:00Z'),
  metadata: {},
});

const createSettlement = (): ClinicPaymentLedgerSettlement => ({
  settledAt: '2099-01-01T12:00:00.000Z',
  baseAmountCents: 20000,
  netAmountCents: 18000,
  split: [],
  remainderCents: 0,
  fingerprint: 'fp-settlement',
  gatewayStatus: 'RECEIVED',
});

const createSettledEvent = (): ClinicPaymentSettledEvent => ({
  eventId: 'evt-1',
  eventName: DomainEvents.CLINIC_PAYMENT_SETTLED,
  aggregateId: 'appointment-1',
  occurredOn: new Date('2099-01-01T12:05:00Z'),
  metadata: {},
  payload: {
    appointmentId: 'appointment-1',
    tenantId: 'tenant-1',
    clinicId: 'clinic-1',
    professionalId: 'professional-1',
    patientId: 'patient-1',
    holdId: 'hold-1',
    serviceTypeId: 'service-1',
    paymentTransactionId: 'trx-1',
    gatewayStatus: 'RECEIVED',
    eventType: 'PAYMENT_CONFIRMED',
    sandbox: false,
    fingerprint: 'fp-settlement',
    payloadId: 'asaas-evt-1',
    amount: { value: 200, netValue: 180 },
    settledAt: new Date('2099-01-01T12:00:00Z'),
    processedAt: new Date('2099-01-01T12:02:00Z'),
  },
});

const createRefund = (): ClinicPaymentLedgerRefund => ({
  refundedAt: '2099-01-02T12:00:00.000Z',
  amountCents: 20000,
  netAmountCents: 18000,
  gatewayStatus: 'REFUNDED',
  fingerprint: 'fp-refund',
});

const createChargeback = (): ClinicPaymentLedgerChargeback => ({
  chargebackAt: '2099-01-03T12:00:00.000Z',
  amountCents: 20000,
  netAmountCents: 18000,
  gatewayStatus: 'CHARGEBACK',
  fingerprint: 'fp-chargeback',
});

const createRefundEvent = (): ClinicPaymentRefundedEvent => ({
  eventId: 'evt-refund',
  eventName: DomainEvents.CLINIC_PAYMENT_REFUNDED,
  aggregateId: 'appointment-1',
  occurredOn: new Date('2099-01-02T12:05:00Z'),
  metadata: {},
  payload: {
    appointmentId: 'appointment-1',
    tenantId: 'tenant-1',
    clinicId: 'clinic-1',
    professionalId: 'professional-1',
    patientId: 'patient-1',
    holdId: 'hold-1',
    serviceTypeId: 'service-1',
    paymentTransactionId: 'trx-1',
    gatewayStatus: 'REFUNDED',
    eventType: 'PAYMENT_REFUNDED',
    sandbox: false,
    fingerprint: 'fp-refund',
    payloadId: 'asaas-evt-refund',
    amount: { value: 200, netValue: 180 },
    refundedAt: new Date('2099-01-02T12:00:00Z'),
    processedAt: new Date('2099-01-02T12:02:00Z'),
  },
});

const createChargebackEvent = (): ClinicPaymentChargebackEvent => ({
  eventId: 'evt-chargeback',
  eventName: DomainEvents.CLINIC_PAYMENT_CHARGEBACK,
  aggregateId: 'appointment-1',
  occurredOn: new Date('2099-01-03T12:05:00Z'),
  metadata: {},
  payload: {
    appointmentId: 'appointment-1',
    tenantId: 'tenant-1',
    clinicId: 'clinic-1',
    professionalId: 'professional-1',
    patientId: 'patient-1',
    holdId: 'hold-1',
    serviceTypeId: 'service-1',
    paymentTransactionId: 'trx-1',
    gatewayStatus: 'CHARGEBACK',
    eventType: 'PAYMENT_CHARGEBACK',
    sandbox: false,
    fingerprint: 'fp-chargeback',
    payloadId: 'asaas-evt-chargeback',
    amount: { value: 200, netValue: 180 },
    chargebackAt: new Date('2099-01-03T12:00:00Z'),
    processedAt: new Date('2099-01-03T12:02:00Z'),
  },
});

describe('ClinicPaymentNotificationService', () => {
  let messageBus: Mocked<MessageBus>;
  let notificationContext: Mocked<ClinicNotificationContextService>;
  let clinicRepository: Mocked<IClinicRepository>;
  let emailService: Mocked<IEmailService>;
  let whatsappService: Mocked<IWhatsAppService>;
  let service: ClinicPaymentNotificationService;

  beforeEach(() => {
    messageBus = {
      publish: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    } as unknown as Mocked<MessageBus>;

    notificationContext = {
      resolveRecipients: jest.fn().mockResolvedValue(['professional-1']),
      resolveNotificationSettings: jest.fn().mockResolvedValue(null),
      resolveChannels: jest.fn().mockReturnValue(['system']),
      resolveRecipientEmails: jest
        .fn()
        .mockResolvedValue([{ userId: 'professional-1', email: 'pro@example.com' }]),
      resolveRecipientPhones: jest
        .fn()
        .mockResolvedValue([{ userId: 'professional-1', phone: '+5511999999999' }]),
      resolveWhatsAppSettings: jest.fn().mockResolvedValue({ enabled: false }),
    } as unknown as Mocked<ClinicNotificationContextService>;

    clinicRepository = {
      findById: jest.fn(),
    } as unknown as Mocked<IClinicRepository>;

    emailService = {
      sendClinicPaymentEmail: jest.fn(),
    } as unknown as Mocked<IEmailService>;

    whatsappService = {
      sendMessage: jest.fn(),
    } as unknown as Mocked<IWhatsAppService>;

    clinicRepository.findById.mockResolvedValue({ id: 'clinic-1', name: 'Clinica XPTO' } as any);
    messageBus.publish.mockResolvedValue(undefined);
    emailService.sendClinicPaymentEmail.mockResolvedValue({ data: undefined });
    whatsappService.sendMessage.mockResolvedValue({ data: undefined });

    service = new ClinicPaymentNotificationService(
      messageBus,
      notificationContext,
      clinicRepository,
      emailService,
      whatsappService,
    );
  });

  it('usa canal system quando nao ha configuracao especifica', async () => {
    notificationContext.resolveNotificationSettings.mockResolvedValueOnce(null);
    notificationContext.resolveChannels.mockReturnValueOnce(['system']);
    notificationContext.resolveWhatsAppSettings.mockResolvedValueOnce(null);

    await service.notifySettlement({
      appointment: createAppointment(),
      event: createSettledEvent(),
      settlement: createSettlement(),
    });

    expect(notificationContext.resolveChannels).toHaveBeenCalledWith(
      expect.objectContaining({ eventKey: 'clinic.payment.settled' }),
    );
    expect(messageBus.publish).toHaveBeenCalledTimes(1);
    const eventPublished = messageBus.publish.mock.calls[0][0];
    expect(eventPublished.payload.channels).toEqual(['system']);
    expect(emailService.sendClinicPaymentEmail).not.toHaveBeenCalled();
    expect(whatsappService.sendMessage).not.toHaveBeenCalled();
  });

  it('nao publica evento quando nenhum canal esta habilitado', async () => {
    notificationContext.resolveChannels.mockReturnValueOnce([]);

    await service.notifySettlement({
      appointment: createAppointment(),
      event: createSettledEvent(),
      settlement: createSettlement(),
    });

    expect(messageBus.publish).not.toHaveBeenCalled();
    expect(emailService.sendClinicPaymentEmail).not.toHaveBeenCalled();
    expect(whatsappService.sendMessage).not.toHaveBeenCalled();
  });

  it('suprime canais em quiet hours quando contexto retorna vazio', async () => {
    notificationContext.resolveChannels.mockReturnValueOnce([]);

    await service.notifySettlement({
      appointment: createAppointment(),
      event: createSettledEvent(),
      settlement: createSettlement(),
    });

    expect(messageBus.publish).not.toHaveBeenCalled();
    expect(emailService.sendClinicPaymentEmail).not.toHaveBeenCalled();
    expect(whatsappService.sendMessage).not.toHaveBeenCalled();
  });

  it('mantem canal system mesmo em quiet hours e publica evento', async () => {
    notificationContext.resolveChannels.mockReturnValueOnce(['system']);

    await service.notifySettlement({
      appointment: createAppointment(),
      event: createSettledEvent(),
      settlement: createSettlement(),
    });

    expect(messageBus.publish).toHaveBeenCalledTimes(1);
    expect(messageBus.publish.mock.calls[0][0].payload.channels).toEqual(['system']);
    expect(emailService.sendClinicPaymentEmail).not.toHaveBeenCalled();
    expect(whatsappService.sendMessage).not.toHaveBeenCalled();
  });

  it('envia email quando canal email esta habilitado', async () => {
    notificationContext.resolveChannels.mockReturnValueOnce(['system', 'email']);

    await service.notifySettlement({
      appointment: createAppointment(),
      event: createSettledEvent(),
      settlement: createSettlement(),
    });

    expect(messageBus.publish).toHaveBeenCalledTimes(1);
    expect(emailService.sendClinicPaymentEmail).toHaveBeenCalledTimes(1);
    expect(whatsappService.sendMessage).not.toHaveBeenCalled();
  });

  it('envia notificacao por whatsapp quando canal habilitado e integracao ativa', async () => {
    notificationContext.resolveChannels.mockReturnValueOnce(['system', 'whatsapp']);
    notificationContext.resolveRecipientPhones.mockResolvedValueOnce([
      { userId: 'professional-1', phone: '+5511999999999' },
    ]);
    notificationContext.resolveWhatsAppSettings.mockResolvedValueOnce({ enabled: true });

    await service.notifySettlement({
      appointment: createAppointment(),
      event: createSettledEvent(),
      settlement: createSettlement(),
    });

    expect(messageBus.publish).toHaveBeenCalledTimes(1);
    expect(whatsappService.sendMessage).toHaveBeenCalledTimes(1);
    const payload = whatsappService.sendMessage.mock.calls[0][0];
    expect(payload.to).toMatch(/^\+\d{10,15}$/);
    expect(payload.body).toContain('Pagamento');
    expect(emailService.sendClinicPaymentEmail).not.toHaveBeenCalled();
  });

  it('publica notificacoes de reembolso e chargeback com canais configurados', async () => {
    notificationContext.resolveChannels.mockReturnValue(['system']);

    await service.notifyRefund({
      appointment: createAppointment(),
      event: createRefundEvent(),
      refund: createRefund(),
    });

    await service.notifyChargeback({
      appointment: createAppointment(),
      event: createChargebackEvent(),
      chargeback: createChargeback(),
    });

    expect(messageBus.publish).toHaveBeenCalledTimes(2);
    expect(emailService.sendClinicPaymentEmail).not.toHaveBeenCalled();
    expect(whatsappService.sendMessage).not.toHaveBeenCalled();
  });
});
