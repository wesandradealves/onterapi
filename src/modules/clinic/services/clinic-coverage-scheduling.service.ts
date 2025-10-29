import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  IClinicHoldRepository,
  IClinicHoldRepository as IClinicHoldRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-hold.repository.interface';
import {
  IClinicAppointmentRepository,
  IClinicAppointmentRepository as IClinicAppointmentRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-appointment.repository.interface';
import {
  IBookingHoldRepository,
  IBookingHoldRepositoryToken,
} from '../../../domain/scheduling/interfaces/repositories/booking-hold.repository.interface';
import {
  IBookingRepository,
  IBookingRepositoryToken,
} from '../../../domain/scheduling/interfaces/repositories/booking.repository.interface';
import { ClinicProfessionalCoverage } from '../../../domain/clinic/types/clinic.types';
import { MessageBus } from '../../../shared/messaging/message-bus';
import { DomainEvents } from '../../../shared/events/domain-events';

@Injectable()
export class ClinicCoverageSchedulingService {
  private readonly logger = new Logger(ClinicCoverageSchedulingService.name);

  constructor(
    @Inject(IClinicHoldRepositoryToken)
    private readonly clinicHoldRepository: IClinicHoldRepository,
    @Inject(IClinicAppointmentRepositoryToken)
    private readonly clinicAppointmentRepository: IClinicAppointmentRepository,
    @Inject(IBookingHoldRepositoryToken)
    private readonly bookingHoldRepository: IBookingHoldRepository,
    @Inject(IBookingRepositoryToken)
    private readonly bookingRepository: IBookingRepository,
    private readonly messageBus: MessageBus,
  ) {}

  async applyCoverage(
    coverage: ClinicProfessionalCoverage,
    context: CoverageSchedulingContext,
  ): Promise<void> {
    const updatedClinicHolds = await this.clinicHoldRepository.reassignForCoverage({
      tenantId: coverage.tenantId,
      clinicId: coverage.clinicId,
      originalProfessionalId: coverage.professionalId,
      coverageProfessionalId: coverage.coverageProfessionalId,
      coverageId: coverage.id,
      start: coverage.startAt,
      end: coverage.endAt,
    });

    const updatedSchedulingHolds = await this.bookingHoldRepository.reassignForCoverage({
      tenantId: coverage.tenantId,
      clinicId: coverage.clinicId,
      originalProfessionalId: coverage.professionalId,
      coverageProfessionalId: coverage.coverageProfessionalId,
      coverageId: coverage.id,
      startAtUtc: coverage.startAt,
      endAtUtc: coverage.endAt,
    });

    const updatedBookings = await this.bookingRepository.reassignForCoverage({
      tenantId: coverage.tenantId,
      clinicId: coverage.clinicId,
      originalProfessionalId: coverage.professionalId,
      coverageProfessionalId: coverage.coverageProfessionalId,
      coverageId: coverage.id,
      startAtUtc: coverage.startAt,
      endAtUtc: coverage.endAt,
    });

    const updatedAppointments = await this.clinicAppointmentRepository.reassignForCoverage({
      tenantId: coverage.tenantId,
      clinicId: coverage.clinicId,
      originalProfessionalId: coverage.professionalId,
      coverageProfessionalId: coverage.coverageProfessionalId,
      coverageId: coverage.id,
      start: coverage.startAt,
      end: coverage.endAt,
    });

    this.logger.debug('Cobertura aplicada na agenda', {
      coverageId: coverage.id,
      clinicId: coverage.clinicId,
      tenantId: coverage.tenantId,
      originalProfessionalId: coverage.professionalId,
      coverageProfessionalId: coverage.coverageProfessionalId,
      updatedClinicHolds: updatedClinicHolds.length,
      updatedSchedulingHolds: updatedSchedulingHolds.length,
      updatedBookings: updatedBookings.length,
      updatedAppointments: updatedAppointments.length,
    });

    await this.messageBus.publish(
      DomainEvents.clinicCoverageApplied(coverage.id, {
        tenantId: coverage.tenantId,
        clinicId: coverage.clinicId,
        originalProfessionalId: coverage.professionalId,
        coverageProfessionalId: coverage.coverageProfessionalId,
        startAt: coverage.startAt,
        endAt: coverage.endAt,
        triggerSource: context.triggerSource,
        triggeredBy: context.triggeredBy,
        triggeredAt: new Date(),
        summary: {
          clinicHolds: updatedClinicHolds.length,
          schedulingHolds: updatedSchedulingHolds.length,
          bookings: updatedBookings.length,
          appointments: updatedAppointments.length,
        },
      }),
    );
  }

  async releaseCoverage(
    coverage: ClinicProfessionalCoverage,
    options: CoverageReleaseContext,
  ): Promise<void> {
    const updatedClinicHolds = await this.clinicHoldRepository.releaseCoverageAssignments({
      tenantId: coverage.tenantId,
      clinicId: coverage.clinicId,
      coverageId: coverage.id,
      reference: options.reference,
      originalProfessionalId: coverage.professionalId,
      coverageProfessionalId: coverage.coverageProfessionalId,
    });

    const updatedSchedulingHolds = await this.bookingHoldRepository.releaseCoverageAssignments({
      tenantId: coverage.tenantId,
      clinicId: coverage.clinicId,
      coverageId: coverage.id,
      referenceUtc: options.reference,
      originalProfessionalId: coverage.professionalId,
      coverageProfessionalId: coverage.coverageProfessionalId,
    });

    const updatedBookings = await this.bookingRepository.releaseCoverageAssignments({
      tenantId: coverage.tenantId,
      clinicId: coverage.clinicId,
      coverageId: coverage.id,
      referenceUtc: options.reference,
      originalProfessionalId: coverage.professionalId,
      coverageProfessionalId: coverage.coverageProfessionalId,
    });

    const updatedAppointments = await this.clinicAppointmentRepository.releaseCoverageAssignments({
      tenantId: coverage.tenantId,
      clinicId: coverage.clinicId,
      coverageId: coverage.id,
      reference: options.reference,
      originalProfessionalId: coverage.professionalId,
      coverageProfessionalId: coverage.coverageProfessionalId,
    });

    this.logger.debug('Cobertura removida da agenda', {
      coverageId: coverage.id,
      clinicId: coverage.clinicId,
      tenantId: coverage.tenantId,
      updatedClinicHolds: updatedClinicHolds.length,
      updatedSchedulingHolds: updatedSchedulingHolds.length,
      updatedBookings: updatedBookings.length,
      updatedAppointments: updatedAppointments.length,
    });

    await this.messageBus.publish(
      DomainEvents.clinicCoverageReleased(coverage.id, {
        tenantId: coverage.tenantId,
        clinicId: coverage.clinicId,
        originalProfessionalId: coverage.professionalId,
        coverageProfessionalId: coverage.coverageProfessionalId,
        reference: options.reference,
        triggerSource: options.triggerSource,
        triggeredBy: options.triggeredBy,
        triggeredAt: new Date(),
        summary: {
          clinicHolds: updatedClinicHolds.length,
          schedulingHolds: updatedSchedulingHolds.length,
          bookings: updatedBookings.length,
          appointments: updatedAppointments.length,
        },
      }),
    );
  }
}

interface CoverageSchedulingContext {
  triggeredBy: string;
  triggerSource: 'manual' | 'automatic';
}

interface CoverageReleaseContext extends CoverageSchedulingContext {
  reference: Date;
}
