import { CheckClinicProfessionalFinancialClearanceUseCase } from '../../../src/modules/clinic/use-cases/check-clinic-professional-financial-clearance.use-case';
import type { IClinicConfigurationRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-configuration.repository.interface';
import type { IClinicAppointmentRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-appointment.repository.interface';

describe('CheckClinicProfessionalFinancialClearanceUseCase', () => {
  let configurationRepository: jest.Mocked<IClinicConfigurationRepository>;
  let appointmentRepository: jest.Mocked<IClinicAppointmentRepository>;
  let useCase: CheckClinicProfessionalFinancialClearanceUseCase;

  beforeEach(() => {
    configurationRepository = {
      findLatestAppliedVersion: jest.fn(),
    } as unknown as jest.Mocked<IClinicConfigurationRepository>;

    appointmentRepository = {
      countByProfessionalAndPaymentStatus: jest.fn().mockResolvedValue(0),
    } as unknown as jest.Mocked<IClinicAppointmentRepository>;

    useCase = new CheckClinicProfessionalFinancialClearanceUseCase(
      configurationRepository,
      appointmentRepository,
    );
  });

  it('should return requiresClearance false when no team configuration exists', async () => {
    configurationRepository.findLatestAppliedVersion.mockResolvedValue(null);

    const result = await useCase.executeOrThrow({
      clinicId: 'clinic-1',
      tenantId: 'tenant-1',
      professionalId: 'professional-1',
    });

    expect(result).toEqual({
      requiresClearance: false,
      hasPendencies: false,
      pendingCount: 0,
      statusesEvaluated: [],
    });
    expect(appointmentRepository.countByProfessionalAndPaymentStatus).not.toHaveBeenCalled();
  });

  it('should report pendencies when clearance is required and counts are greater than zero', async () => {
    configurationRepository.findLatestAppliedVersion.mockResolvedValue({
      payload: { requireFinancialClearance: true },
    } as any);
    appointmentRepository.countByProfessionalAndPaymentStatus.mockResolvedValue(3);

    const result = await useCase.executeOrThrow({
      clinicId: 'clinic-1',
      tenantId: 'tenant-1',
      professionalId: 'professional-1',
    });

    expect(result.requiresClearance).toBe(true);
    expect(result.hasPendencies).toBe(true);
    expect(result.pendingCount).toBe(3);
    expect(result.statusesEvaluated).toEqual(['chargeback', 'failed']);
  });

  it('should reuse nested teamSettings flag when payload is nested', async () => {
    configurationRepository.findLatestAppliedVersion.mockResolvedValue({
      payload: {
        teamSettings: {
          requireFinancialClearance: true,
        },
      },
    } as any);
    appointmentRepository.countByProfessionalAndPaymentStatus.mockResolvedValue(0);

    const result = await useCase.executeOrThrow({
      clinicId: 'clinic-1',
      tenantId: 'tenant-1',
      professionalId: 'professional-1',
    });

    expect(result.requiresClearance).toBe(true);
    expect(result.hasPendencies).toBe(false);
    expect(result.pendingCount).toBe(0);
    expect(result.statusesEvaluated).toEqual(['chargeback', 'failed']);
  });
});
