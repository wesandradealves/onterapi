import { ArchivePatientUseCase } from '@modules/patients/use-cases/archive-patient.use-case';
import { IPatientRepository } from '@domain/patients/interfaces/repositories/patient.repository.interface';
import { PatientAuditService } from '@infrastructure/patients/services/patient-audit.service';
import { PatientNotificationService } from '@infrastructure/patients/services/patient-notification.service';
import { MessageBus } from '@shared/messaging/message-bus';
import { RolesEnum } from '@domain/auth/enums/roles.enum';

const tenantId = 'tenant-1';
const patient = {
  id: 'patient-1',
  slug: 'patient-1',
  tenantId,
};

describe('ArchivePatientUseCase', () => {
  let repository: jest.Mocked<IPatientRepository>;
  let audit: jest.Mocked<PatientAuditService>;
  let notification: jest.Mocked<PatientNotificationService>;
  let messageBus: jest.Mocked<MessageBus>;
  let useCase: ArchivePatientUseCase;

  beforeEach(() => {
    repository = {
      findBySlug: jest.fn().mockResolvedValue(patient as any),
      archive: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IPatientRepository>;

    audit = {
      register: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<PatientAuditService>;

    notification = {
      notifyArchive: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<PatientNotificationService>;

    messageBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MessageBus>;

    useCase = new ArchivePatientUseCase(repository, audit, notification, messageBus);
  });

  it('arquiva paciente e emite auditoria', async () => {
    const result = await useCase.execute({
      tenantId,
      patientSlug: 'patient-1',
      requesterRole: RolesEnum.CLINIC_OWNER,
      requestedBy: 'user-1',
      reason: 'duplicate',
    });

    expect(result.error).toBeUndefined();
    expect(repository.archive).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: 'patient-1', reason: 'duplicate' }),
    );
    expect(audit.register).toHaveBeenCalledWith('patient.archived', expect.any(Object));
    expect(notification.notifyArchive).toHaveBeenCalledWith('patient-1', tenantId, 'duplicate');
    expect(messageBus.publish).toHaveBeenCalled();
  });

  it('falha quando paciente nao encontrado', async () => {
    repository.findBySlug.mockResolvedValue(null);

    const result = await useCase.execute({
      tenantId,
      patientSlug: 'unknown',
      requesterRole: RolesEnum.CLINIC_OWNER,
      requestedBy: 'user-1',
      reason: 'duplicate',
    });

    expect(result.data).toBeUndefined();
    expect(result.error).toBeInstanceOf(Error);
    expect(repository.archive).not.toHaveBeenCalled();
  });

  it('bloqueia usuarios sem permissao', async () => {
    const result = await useCase.execute({
      tenantId,
      patientSlug: 'patient-1',
      requesterRole: RolesEnum.SECRETARY,
      requestedBy: 'user-1',
      reason: 'duplicate',
    });

    expect(result.data).toBeUndefined();
    expect(result.error).toBeInstanceOf(Error);
    expect(repository.archive).not.toHaveBeenCalled();
  });
});
