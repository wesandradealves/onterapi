import { GetPatientUseCase } from '@modules/patients/use-cases/get-patient.use-case';
import { IPatientRepository } from '@domain/patients/interfaces/repositories/patient.repository.interface';
import { PatientAISuggestionsService } from '@infrastructure/patients/services/patient-ai-suggestions.service';
import { PatientAuditService } from '@infrastructure/patients/services/patient-audit.service';
import { RolesEnum } from '@domain/auth/enums/roles.enum';
import { unwrapResult } from '@shared/types/result.type';
import { Patient } from '@domain/patients/types/patient.types';

describe('GetPatientUseCase', () => {
  let repository: jest.Mocked<IPatientRepository>;
  let aiSuggestions: jest.Mocked<PatientAISuggestionsService>;
  let auditService: jest.Mocked<PatientAuditService>;
  let useCase: GetPatientUseCase;

  const patient = {
    id: 'patient-1',
    slug: 'john-doe',
    tenantId: 'tenant-1',
    professionalId: 'professional-1',
    fullName: 'John Doe',
    status: 'active',
    emailVerified: false,
    contact: { email: 'john@example.com' },
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  } as Patient;

  const summary = {
    totals: {
      appointments: 3,
      completedAppointments: 2,
      cancellations: 1,
      revenue: 1000,
      pendingPayments: 0,
    },
    alerts: [],
  };

  const timeline = [
    {
      id: 'event-1',
      type: 'appointment',
      title: 'Consulta',
      occurredAt: new Date('2025-01-02T00:00:00.000Z'),
    },
  ];

  beforeEach(() => {
    repository = {
      findBySlug: jest.fn().mockResolvedValue({ ...patient }),
      findSummary: jest.fn().mockResolvedValue(summary),
      findTimeline: jest.fn().mockResolvedValue(timeline),
    } as unknown as jest.Mocked<IPatientRepository>;

    aiSuggestions = {
      getInsights: jest.fn().mockResolvedValue({ nextSteps: ['follow_up'] }),
    } as unknown as jest.Mocked<PatientAISuggestionsService>;

    auditService = {
      register: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<PatientAuditService>;

    useCase = new GetPatientUseCase(repository, aiSuggestions, auditService);
  });

  it('retorna paciente e quick actions para clinic owner', async () => {
    const result = unwrapResult(
      await useCase.execute({
        tenantId: 'tenant-1',
        requesterId: 'owner-1',
        requesterRole: RolesEnum.CLINIC_OWNER,
        patientSlug: 'john-doe',
      }),
    );

    expect(repository.findBySlug).toHaveBeenCalledWith('tenant-1', 'john-doe');
    expect(repository.findSummary).toHaveBeenCalledWith('tenant-1', 'patient-1');
    expect(aiSuggestions.getInsights).toHaveBeenCalledWith('patient-1', 'tenant-1');
    expect(auditService.register).toHaveBeenCalledWith('patient.viewed', expect.any(Object));
    expect(result.patient.id).toBe('patient-1');
    expect(result.quickActions).toEqual(
      expect.arrayContaining(['transfer_patient', 'view_financials', 'resend_verification']),
    );
  });

  it('impede acesso de profissional sem vinculo', async () => {
    repository.findBySlug.mockResolvedValue({ ...patient, professionalId: 'other-prof' });

    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        requesterId: 'professional-1',
        requesterRole: RolesEnum.PROFESSIONAL,
        patientSlug: 'john-doe',
      }),
    ).rejects.toBeInstanceOf(Error);
    expect(repository.findSummary).not.toHaveBeenCalled();
  });

  it('retorna quick actions especificas para profissional associado', async () => {
    repository.findBySlug.mockResolvedValue({ ...patient, emailVerified: true });

    const result = unwrapResult(
      await useCase.execute({
        tenantId: 'tenant-1',
        requesterId: 'professional-1',
        requesterRole: RolesEnum.PROFESSIONAL,
        patientSlug: 'john-doe',
      }),
    );

    expect(result.quickActions).toEqual(
      expect.arrayContaining(['create_appointment', 'add_note', 'open_anamnesis']),
    );
  });
  it('retorna erro quando paciente nao encontrado', async () => {
    repository.findBySlug.mockResolvedValueOnce(null as unknown as Patient);

    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        requesterId: 'owner-1',
        requesterRole: RolesEnum.CLINIC_OWNER,
        patientSlug: 'john-doe',
      }),
    ).rejects.toBeInstanceOf(Error);
    expect(repository.findSummary).not.toHaveBeenCalled();
  });

  it('bloqueia acesso quando role nao mapeada', async () => {
    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        requesterId: 'user-1',
        requesterRole: 'UNKNOWN_ROLE',
        patientSlug: 'john-doe',
      }),
    ).rejects.toBeInstanceOf(Error);
    expect(repository.findSummary).not.toHaveBeenCalled();
  });

  it('retorna quick actions para secretaria', async () => {
    repository.findBySlug.mockResolvedValueOnce({ ...patient, emailVerified: true });

    const result = unwrapResult(
      await useCase.execute({
        tenantId: 'tenant-1',
        requesterId: 'secretary-1',
        requesterRole: RolesEnum.SECRETARY,
        patientSlug: 'john-doe',
      }),
    );

    expect(result.quickActions).toEqual(
      expect.arrayContaining(['schedule_follow_up', 'send_message']),
    );
    expect(result.quickActions).not.toEqual(
      expect.arrayContaining(['transfer_patient', 'view_financials']),
    );
  });

  it('retorna quick actions para manager com resend quando necessario', async () => {
    repository.findBySlug.mockResolvedValueOnce({ ...patient, emailVerified: false });

    const result = unwrapResult(
      await useCase.execute({
        tenantId: 'tenant-1',
        requesterId: 'manager-1',
        requesterRole: RolesEnum.MANAGER,
        patientSlug: 'john-doe',
      }),
    );

    expect(result.quickActions).toEqual(
      expect.arrayContaining(['transfer_patient', 'view_financials', 'resend_verification']),
    );
  });
  it('bloqueia acesso para roles publicas', async () => {
    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        requesterId: 'patient-1',
        requesterRole: RolesEnum.PATIENT,
        patientSlug: 'john-doe',
      }),
    ).rejects.toBeInstanceOf(Error);
    expect(repository.findSummary).not.toHaveBeenCalled();
  });
});
