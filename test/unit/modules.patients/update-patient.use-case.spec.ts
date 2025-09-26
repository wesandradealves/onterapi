import { UpdatePatientUseCase } from '@modules/patients/use-cases/update-patient.use-case';
import { IPatientRepository } from '@domain/patients/interfaces/repositories/patient.repository.interface';
import { PatientAuditService } from '@infrastructure/patients/services/patient-audit.service';
import { MessageBus } from '@shared/messaging/message-bus';
import { RolesEnum } from '@domain/auth/enums/roles.enum';
import { Patient } from '@domain/patients/types/patient.types';
import { unwrapResult } from '@shared/types/result.type';
import { DomainEvents } from '@shared/events/domain-events';

describe('UpdatePatientUseCase', () => {
  let repository: jest.Mocked<IPatientRepository>;
  let audit: jest.Mocked<PatientAuditService>;
  let messageBus: jest.Mocked<MessageBus>;
  let useCase: UpdatePatientUseCase;

  const existing: Patient = {
    id: 'patient-1',
    slug: 'patient-1',
    tenantId: 'tenant-1',
    professionalId: 'professional-1',
    fullName: 'Paciente 1',
    status: 'active',
    emailVerified: true,
    contact: {},
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    tags: [],
  };

  beforeEach(() => {
    repository = {
      findBySlug: jest.fn().mockResolvedValue(existing),
      update: jest.fn().mockResolvedValue({
        ...existing,
        fullName: 'Paciente Atualizado',
        status: 'inactive',
        professionalId: 'professional-2',
        riskLevel: 'high',
        tags: [{ id: 'vip', label: 'VIP' }],
        updatedAt: new Date('2025-01-03T00:00:00.000Z'),
      }),
    } as unknown as jest.Mocked<IPatientRepository>;

    audit = {
      register: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<PatientAuditService>;

    messageBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MessageBus>;

    useCase = new UpdatePatientUseCase(repository, audit, messageBus);
  });

  it('atualiza paciente e publica evento de mudanca', async () => {
    const result = unwrapResult(
      await useCase.execute({
        tenantId: 'tenant-1',
        patientSlug: 'patient-1',
        updatedBy: 'admin-1',
        requesterRole: RolesEnum.SUPER_ADMIN,
        fullName: 'Paciente Atualizado',
        status: 'inactive',
        professionalId: 'professional-2',
        riskLevel: 'high',
        tags: ['vip'],
      }),
    );

    expect(repository.update).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: 'patient-1', professionalId: 'professional-2' }),
    );
    expect(audit.register).toHaveBeenCalledWith('patient.updated', expect.any(Object));
    expect(messageBus.publish).toHaveBeenCalled();

    const event = messageBus.publish.mock.calls[0][0];
    expect(event.eventName).toBe(DomainEvents.PATIENT_UPDATED);
    expect(event.payload.changes).toMatchObject({
      fullName: 'Paciente Atualizado',
      status: 'inactive',
      professionalId: 'professional-2',
      riskLevel: 'high',
      tags: [{ id: 'vip', label: 'VIP' }],
    });
    expect(result.fullName).toBe('Paciente Atualizado');
  });

  it('bloqueia quando role nao mapeada', async () => {
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      patientSlug: 'patient-1',
      updatedBy: 'user-1',
      requesterRole: 'UNKNOWN_ROLE',
    });

    expect(result.data).toBeUndefined();
    expect(result.error).toBeInstanceOf(Error);
  });

  it('bloqueia profissional que nao e responsavel', async () => {
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      patientSlug: 'patient-1',
      updatedBy: 'another-prof',
      requesterRole: RolesEnum.PROFESSIONAL,
    });

    expect(result.data).toBeUndefined();
    expect(result.error).toBeInstanceOf(Error);
  });

  it('bloqueia secretaria alterando dados clinicos', async () => {
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      patientSlug: 'patient-1',
      updatedBy: 'secretary-1',
      requesterRole: RolesEnum.SECRETARY,
      medical: { observations: 'dados clinicos' },
    });

    expect(result.data).toBeUndefined();
    expect(result.error).toBeInstanceOf(Error);
  });

  it('bloqueia manager alterando dados clinicos', async () => {
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      patientSlug: 'patient-1',
      updatedBy: 'manager-1',
      requesterRole: RolesEnum.MANAGER,
      medical: { observations: 'dados clinicos' },
    });

    expect(result.data).toBeUndefined();
    expect(result.error).toBeInstanceOf(Error);
  });
  it('retorna erro quando paciente nao encontrado', async () => {
    repository.findBySlug.mockResolvedValueOnce(null as unknown as Patient);

    const result = await useCase.execute({
      tenantId: 'tenant-1',
      patientSlug: 'patient-1',
      updatedBy: 'admin-1',
      requesterRole: RolesEnum.SUPER_ADMIN,
    });

    expect(result.data).toBeUndefined();
    expect(result.error).toBeInstanceOf(Error);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('permite secretaria atualizar dados nao clinicos', async () => {
    const updatedPatient = {
      ...existing,
      contact: { email: 'nova-secretaria@example.com' } as Patient['contact'],
      updatedAt: new Date('2025-02-01T00:00:00.000Z'),
    } as Patient;

    repository.update.mockResolvedValueOnce(updatedPatient);

    const result = unwrapResult(
      await useCase.execute({
        tenantId: 'tenant-1',
        patientSlug: 'patient-1',
        updatedBy: 'secretary-1',
        requesterRole: RolesEnum.SECRETARY,
        contact: { email: 'nova-secretaria@example.com' } as Patient['contact'],
      }),
    );

    expect(repository.update).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: 'patient-1', contact: expect.any(Object) }),
    );
    expect(result.contact?.email).toBe('nova-secretaria@example.com');
  });

  it('permite manager atualizar dados administrativos', async () => {
    const updatedPatient = {
      ...existing,
      status: 'inactive',
      updatedAt: new Date('2025-03-01T00:00:00.000Z'),
    } as Patient;

    repository.update.mockResolvedValueOnce(updatedPatient);

    const result = unwrapResult(
      await useCase.execute({
        tenantId: 'tenant-1',
        patientSlug: 'patient-1',
        updatedBy: 'manager-1',
        requesterRole: RolesEnum.MANAGER,
        status: 'inactive',
      }),
    );

    expect(repository.update).toHaveBeenCalled();
    expect(result.status).toBe('inactive');
  });
  it('permite profissional responsavel atualizar dados permitidos', async () => {
    const updatedPatient = {
      ...existing,
      fullName: 'Nome Profissional',
      updatedAt: new Date('2025-04-01T00:00:00.000Z'),
    } as Patient;

    repository.update.mockResolvedValueOnce(updatedPatient);

    const result = unwrapResult(
      await useCase.execute({
        tenantId: 'tenant-1',
        patientSlug: 'patient-1',
        updatedBy: 'professional-1',
        requesterRole: RolesEnum.PROFESSIONAL,
        fullName: 'Nome Profissional',
      }),
    );

    expect(result.fullName).toBe('Nome Profissional');
  });

  it('bloqueia roles internas nao autorizadas', async () => {
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      patientSlug: 'patient-1',
      updatedBy: 'finance-1',
      requesterRole: RolesEnum.ADMIN_FINANCEIRO,
    });

    expect(result.data).toBeUndefined();
    expect(result.error).toBeInstanceOf(Error);
  });
});


