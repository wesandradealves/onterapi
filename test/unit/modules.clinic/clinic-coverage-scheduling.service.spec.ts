import { ClinicCoverageSchedulingService } from '../../../src/modules/clinic/services/clinic-coverage-scheduling.service';
import { IClinicHoldRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-hold.repository.interface';
import { IClinicAppointmentRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-appointment.repository.interface';
import { IBookingHoldRepository } from '../../../src/domain/scheduling/interfaces/repositories/booking-hold.repository.interface';
import { IBookingRepository } from '../../../src/domain/scheduling/interfaces/repositories/booking.repository.interface';
import { ClinicProfessionalCoverage } from '../../../src/domain/clinic/types/clinic.types';
import { MessageBus } from '../../../src/shared/messaging/message-bus';
import { DomainEvents } from '../../../src/shared/events/domain-events';

describe('ClinicCoverageSchedulingService', () => {
  let clinicHoldRepository: jest.Mocked<IClinicHoldRepository>;
  let clinicAppointmentRepository: jest.Mocked<IClinicAppointmentRepository>;
  let bookingHoldRepository: jest.Mocked<IBookingHoldRepository>;
  let bookingRepository: jest.Mocked<IBookingRepository>;
  let messageBus: jest.Mocked<MessageBus>;
  let service: ClinicCoverageSchedulingService;

  const coverageFixture = (): ClinicProfessionalCoverage => ({
    id: 'coverage-1',
    tenantId: 'tenant-1',
    clinicId: 'clinic-1',
    professionalId: 'professional-1',
    coverageProfessionalId: 'professional-2',
    startAt: new Date('2025-03-10T08:00:00Z'),
    endAt: new Date('2025-03-10T18:00:00Z'),
    status: 'scheduled',
    reason: 'Ferias',
    notes: null,
    metadata: {},
    createdBy: 'owner-1',
    createdAt: new Date('2025-02-20T10:00:00Z'),
    updatedAt: new Date('2025-02-20T10:00:00Z'),
    updatedBy: 'owner-1',
    cancelledAt: undefined,
    cancelledBy: undefined,
  });

  beforeEach(() => {
    clinicHoldRepository = {
      reassignForCoverage: jest.fn().mockResolvedValue([]),
      releaseCoverageAssignments: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IClinicHoldRepository>;

    clinicAppointmentRepository = {
      reassignForCoverage: jest.fn().mockResolvedValue([]),
      releaseCoverageAssignments: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IClinicAppointmentRepository>;

    bookingHoldRepository = {
      reassignForCoverage: jest.fn().mockResolvedValue([]),
      releaseCoverageAssignments: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IBookingHoldRepository>;

    bookingRepository = {
      reassignForCoverage: jest.fn().mockResolvedValue([]),
      releaseCoverageAssignments: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IBookingRepository>;

    messageBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MessageBus>;

    service = new ClinicCoverageSchedulingService(
      clinicHoldRepository,
      clinicAppointmentRepository,
      bookingHoldRepository,
      bookingRepository,
      messageBus,
    );
  });

  it('propaga aplicacao da cobertura para agenda', async () => {
    const coverage = coverageFixture();

    await service.applyCoverage(coverage, {
      triggeredBy: 'manager-2',
      triggerSource: 'manual',
    });

    expect(clinicHoldRepository.reassignForCoverage).toHaveBeenCalledWith({
      tenantId: coverage.tenantId,
      clinicId: coverage.clinicId,
      originalProfessionalId: coverage.professionalId,
      coverageProfessionalId: coverage.coverageProfessionalId,
      coverageId: coverage.id,
      start: coverage.startAt,
      end: coverage.endAt,
    });
    expect(bookingHoldRepository.reassignForCoverage).toHaveBeenCalledWith({
      tenantId: coverage.tenantId,
      clinicId: coverage.clinicId,
      originalProfessionalId: coverage.professionalId,
      coverageProfessionalId: coverage.coverageProfessionalId,
      coverageId: coverage.id,
      startAtUtc: coverage.startAt,
      endAtUtc: coverage.endAt,
    });
    expect(bookingRepository.reassignForCoverage).toHaveBeenCalledWith({
      tenantId: coverage.tenantId,
      clinicId: coverage.clinicId,
      originalProfessionalId: coverage.professionalId,
      coverageProfessionalId: coverage.coverageProfessionalId,
      coverageId: coverage.id,
      startAtUtc: coverage.startAt,
      endAtUtc: coverage.endAt,
    });
    expect(clinicAppointmentRepository.reassignForCoverage).toHaveBeenCalledWith({
      tenantId: coverage.tenantId,
      clinicId: coverage.clinicId,
      originalProfessionalId: coverage.professionalId,
      coverageProfessionalId: coverage.coverageProfessionalId,
      coverageId: coverage.id,
      start: coverage.startAt,
      end: coverage.endAt,
    });
    expect(messageBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: DomainEvents.CLINIC_COVERAGE_APPLIED,
      }),
    );
  });

  it('propaga remocao da cobertura para agenda', async () => {
    const coverage = coverageFixture();
    const completion = new Date('2025-03-10T18:05:00Z');

    await service.releaseCoverage(coverage, {
      reference: completion,
      triggeredBy: 'system:worker',
      triggerSource: 'automatic',
    });

    expect(clinicHoldRepository.releaseCoverageAssignments).toHaveBeenCalledWith({
      tenantId: coverage.tenantId,
      clinicId: coverage.clinicId,
      coverageId: coverage.id,
      reference: completion,
      originalProfessionalId: coverage.professionalId,
      coverageProfessionalId: coverage.coverageProfessionalId,
    });
    expect(bookingHoldRepository.releaseCoverageAssignments).toHaveBeenCalledWith({
      tenantId: coverage.tenantId,
      clinicId: coverage.clinicId,
      coverageId: coverage.id,
      referenceUtc: completion,
      originalProfessionalId: coverage.professionalId,
      coverageProfessionalId: coverage.coverageProfessionalId,
    });
    expect(bookingRepository.releaseCoverageAssignments).toHaveBeenCalledWith({
      tenantId: coverage.tenantId,
      clinicId: coverage.clinicId,
      coverageId: coverage.id,
      referenceUtc: completion,
      originalProfessionalId: coverage.professionalId,
      coverageProfessionalId: coverage.coverageProfessionalId,
    });
    expect(clinicAppointmentRepository.releaseCoverageAssignments).toHaveBeenCalledWith({
      tenantId: coverage.tenantId,
      clinicId: coverage.clinicId,
      coverageId: coverage.id,
      reference: completion,
      originalProfessionalId: coverage.professionalId,
      coverageProfessionalId: coverage.coverageProfessionalId,
    });
    expect(messageBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: DomainEvents.CLINIC_COVERAGE_RELEASED,
      }),
    );
  });
});
