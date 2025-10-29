import { TransferPatientUseCase } from '@modules/patients/use-cases/transfer-patient.use-case';
import { IPatientRepository } from '@domain/patients/interfaces/repositories/patient.repository.interface';
import { PatientAuditService } from '@infrastructure/patients/services/patient-audit.service';
import { PatientNotificationService } from '@infrastructure/patients/services/patient-notification.service';
import { MessageBus } from '@shared/messaging/message-bus';
import { RolesEnum } from '@domain/auth/enums/roles.enum';
import { Patient } from '@domain/patients/types/patient.types';

describe('TransferPatientUseCase', () => {
  let repository: jest.Mocked<IPatientRepository>;
  let audit: jest.Mocked<PatientAuditService>;
  let notification: jest.Mocked<PatientNotificationService>;
  let messageBus: jest.Mocked<MessageBus>;
  let useCase: TransferPatientUseCase;

  const patient = {
    id: 'patient-1',
    slug: 'patient-1',
    tenantId: 'tenant-1',
    professionalId: 'professional-1',
  } as Patient;

  const transferred = { ...patient, professionalId: 'professional-2' } as Patient;

  beforeEach(() => {
    repository = {
      findBySlug: jest.fn().mockResolvedValue(patient),
      transfer: jest.fn().mockResolvedValue(transferred),
    } as unknown as jest.Mocked<IPatientRepository>;

    audit = {
      register: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<PatientAuditService>;

    notification = {
      notifyTransfer: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<PatientNotificationService>;

    messageBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MessageBus>;

    useCase = new TransferPatientUseCase(repository, audit, notification, messageBus);
  });

  it('transfere paciente quando role autorizada', async () => {
    const result = await useCase.executeOrThrow({
      tenantId: 'tenant-1',
      patientSlug: 'patient-1',
      requesterRole: RolesEnum.CLINIC_OWNER,
      requestedBy: 'admin-1',
      fromProfessionalId: 'professional-1',
      toProfessionalId: 'professional-2',
      reason: 'Realloc',
    });

    expect(repository.transfer).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: 'patient-1', toProfessionalId: 'professional-2' }),
    );
    expect(audit.register).toHaveBeenCalledWith('patient.transferred', expect.any(Object));
    expect(notification.notifyTransfer).toHaveBeenCalledWith({
      patientId: 'patient-1',
      tenantId: 'tenant-1',
      fromProfessionalId: 'professional-1',
      toProfessionalId: 'professional-2',
    });
    expect(messageBus.publish).toHaveBeenCalled();
    expect(result.professionalId).toBe('professional-2');
  });

  it('bloqueia quando paciente nao encontrado', async () => {
    repository.findBySlug.mockResolvedValue(null);

    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        patientSlug: 'missing',
        requesterRole: RolesEnum.CLINIC_OWNER,
        requestedBy: 'admin-1',
        toProfessionalId: 'professional-2',
        reason: 'Realloc',
      }),
    ).rejects.toThrow(Error);
    expect(repository.transfer).not.toHaveBeenCalled();
  });

  it('bloqueia quando profissional atual diverge', async () => {
    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        patientSlug: 'patient-1',
        requesterRole: RolesEnum.CLINIC_OWNER,
        requestedBy: 'admin-1',
        fromProfessionalId: 'different-professional',
        toProfessionalId: 'professional-2',
        reason: 'Realloc',
      }),
    ).rejects.toThrow(Error);
    expect(repository.transfer).not.toHaveBeenCalled();
  });

  it('bloqueia roles nao autorizadas', async () => {
    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        patientSlug: 'patient-1',
        requesterRole: RolesEnum.SECRETARY,
        requestedBy: 'secretary-1',
        toProfessionalId: 'professional-2',
        reason: 'Realloc',
      }),
    ).rejects.toThrow(Error);
  });
});
