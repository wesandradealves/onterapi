import { ExportPatientsUseCase } from '@modules/patients/use-cases/export-patients.use-case';
import { IPatientRepository } from '@domain/patients/interfaces/repositories/patient.repository.interface';
import { PatientAuditService } from '@infrastructure/patients/services/patient-audit.service';
import { RolesEnum } from '@domain/auth/enums/roles.enum';
import { unwrapResult } from '@shared/types/result.type';

describe('ExportPatientsUseCase', () => {
  let repository: jest.Mocked<IPatientRepository>;
  let audit: jest.Mocked<PatientAuditService>;
  let useCase: ExportPatientsUseCase;

  beforeEach(() => {
    repository = {
      export: jest.fn().mockResolvedValue('https://files/export.csv'),
    } as unknown as jest.Mocked<IPatientRepository>;

    audit = {
      register: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<PatientAuditService>;

    useCase = new ExportPatientsUseCase(repository, audit);
  });

  it('permite export por roles autorizadas', async () => {
    const result = unwrapResult(
      await useCase.execute({
        tenantId: 'tenant-1',
        requestedBy: 'admin-1',
        requesterRole: RolesEnum.CLINIC_OWNER,
        format: 'csv',
        filters: { status: ['active'] },
      }),
    );

    expect(repository.export).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1', format: 'csv' }),
    );
    expect(audit.register).toHaveBeenCalledWith('patient.export.requested', expect.any(Object));
    expect(result.fileUrl).toBe('https://files/export.csv');
  });

  it('bloqueia solicitacao de role nao autorizada', async () => {
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      requestedBy: 'user-1',
      requesterRole: RolesEnum.SECRETARY,
      format: 'csv',
    });

    expect(result.data).toBeUndefined();
    expect(result.error).toBeInstanceOf(Error);
    expect(repository.export).not.toHaveBeenCalled();
  });
});
