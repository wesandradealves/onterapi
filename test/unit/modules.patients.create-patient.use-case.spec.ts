import { CreatePatientUseCase } from '@modules/patients/use-cases/create-patient.use-case';
import { IPatientRepository } from '@domain/patients/interfaces/repositories/patient.repository.interface';
import { PatientNotificationService } from '@infrastructure/patients/services/patient-notification.service';
import { PatientAuditService } from '@infrastructure/patients/services/patient-audit.service';
import { MessageBus } from '@shared/messaging/message-bus';
import { RolesEnum } from '@domain/auth/enums/roles.enum';
import { Patient } from '@domain/patients/types/patient.types';

describe('CreatePatientUseCase', () => {
  let repository: jest.Mocked<IPatientRepository>;
  let notification: jest.Mocked<PatientNotificationService>;
  let audit: jest.Mocked<PatientAuditService>;
  let messageBus: jest.Mocked<MessageBus>;
  let useCase: CreatePatientUseCase;

  const input = {
    tenantId: 'tenant-id',
    createdBy: 'user-id',
    requesterRole: RolesEnum.CLINIC_OWNER,
    professionalId: 'professional-id',
    fullName: 'Paciente Teste',
    cpf: '11122233344',
    contact: {
      email: 'paciente@example.com',
      phone: '11999990000',
      whatsapp: '11999990000',
    },
  } as any;

  const patient = {
    id: 'patient-id',
    tenantId: input.tenantId,
    professionalId: input.professionalId,
    status: 'new',
  } as Patient;

  beforeEach(() => {
    repository = {
      existsByCpf: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<IPatientRepository>;

    notification = {
      sendWelcomeMessage: jest.fn(),
    } as unknown as jest.Mocked<PatientNotificationService>;

    audit = {
      register: jest.fn(),
    } as unknown as jest.Mocked<PatientAuditService>;

    messageBus = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<MessageBus>;

    repository.existsByCpf.mockResolvedValue(false);
    repository.create.mockResolvedValue(patient);
    notification.sendWelcomeMessage.mockResolvedValue(undefined as any);
    audit.register.mockResolvedValue(undefined as any);
    messageBus.publish.mockResolvedValue(undefined as any);

    useCase = new CreatePatientUseCase(repository, notification, audit, messageBus);
  });

  it('cria paciente quando role autorizada', async () => {
    const created = await useCase.executeOrThrow(input);

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'new' }));
    expect(notification.sendWelcomeMessage).toHaveBeenCalledWith(patient.id, patient.tenantId);
    expect(audit.register).toHaveBeenCalledWith('patient.created', expect.any(Object));
    expect(messageBus.publish).toHaveBeenCalled();
    expect(created).toBe(patient);
  });

  it('retorna erro quando CPF ja cadastrado', async () => {
    repository.existsByCpf.mockResolvedValue(true);

    await expect(useCase.execute(input)).rejects.toThrow(Error);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('retorna erro quando role nao autorizada', async () => {
    const unauthorizedInput = { ...input, requesterRole: RolesEnum.PATIENT };

    await expect(useCase.execute(unauthorizedInput)).rejects.toThrow(Error);
    expect(repository.create).not.toHaveBeenCalled();
  });
});
