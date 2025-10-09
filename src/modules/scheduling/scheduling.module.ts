import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BookingRepository } from '../../infrastructure/scheduling/repositories/booking.repository';
import { BookingEntity } from '../../infrastructure/scheduling/entities/booking.entity';
import { IBookingRepositoryToken } from '../../domain/scheduling/interfaces/repositories/booking.repository.interface';
import { BookingHoldRepository } from '../../infrastructure/scheduling/repositories/booking-hold.repository';
import { BookingHoldEntity } from '../../infrastructure/scheduling/entities/booking-hold.entity';
import { IBookingHoldRepositoryToken } from '../../domain/scheduling/interfaces/repositories/booking-hold.repository.interface';
import { ClinicInvitationPolicyRepository } from '../../infrastructure/scheduling/repositories/clinic-invitation-policy.repository';
import { ClinicInvitationPolicyEntity } from '../../infrastructure/scheduling/entities/clinic-invitation-policy.entity';
import { IClinicInvitationPolicyRepositoryToken } from '../../domain/scheduling/interfaces/repositories/clinic-invitation-policy.repository.interface';
import { RecurrenceRepository } from '../../infrastructure/scheduling/repositories/recurrence.repository';
import { RecurrenceSeriesEntity } from '../../infrastructure/scheduling/entities/recurrence-series.entity';
import { RecurrenceOccurrenceEntity } from '../../infrastructure/scheduling/entities/recurrence-occurrence.entity';
import { IRecurrenceRepositoryToken } from '../../domain/scheduling/interfaces/repositories/recurrence.repository.interface';
import { ExternalCalendarEventsRepository } from '../../infrastructure/scheduling/repositories/external-calendar-events.repository';
import { ExternalCalendarEventEntity } from '../../infrastructure/scheduling/entities/external-calendar-event.entity';
import { IExternalCalendarEventsRepositoryToken } from '../../domain/scheduling/interfaces/repositories/external-calendar-events.repository.interface';
import { MarkBookingNoShowUseCase } from './use-cases/mark-booking-no-show.use-case';
import { IMarkBookingNoShowUseCase } from '../../domain/scheduling/interfaces/use-cases/mark-booking-no-show.use-case.interface';
import { CreateHoldUseCase } from './use-cases/create-hold.use-case';
import { ICreateHoldUseCase } from '../../domain/scheduling/interfaces/use-cases/create-hold.use-case.interface';
import { ConfirmBookingUseCase } from './use-cases/confirm-booking.use-case';
import { IConfirmBookingUseCase } from '../../domain/scheduling/interfaces/use-cases/confirm-booking.use-case.interface';
import { RescheduleBookingUseCase } from './use-cases/reschedule-booking.use-case';
import { IRescheduleBookingUseCase } from '../../domain/scheduling/interfaces/use-cases/reschedule-booking.use-case.interface';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingEntity,
      BookingHoldEntity,
      ClinicInvitationPolicyEntity,
      RecurrenceSeriesEntity,
      RecurrenceOccurrenceEntity,
      ExternalCalendarEventEntity,
    ]),
  ],
  providers: [
    {
      provide: IBookingRepositoryToken,
      useClass: BookingRepository,
    },
    {
      provide: IBookingHoldRepositoryToken,
      useClass: BookingHoldRepository,
    },
    {
      provide: IClinicInvitationPolicyRepositoryToken,
      useClass: ClinicInvitationPolicyRepository,
    },
    {
      provide: IRecurrenceRepositoryToken,
      useClass: RecurrenceRepository,
    },
    {
      provide: IExternalCalendarEventsRepositoryToken,
      useClass: ExternalCalendarEventsRepository,
    },
    {
      provide: IMarkBookingNoShowUseCase,
      useClass: MarkBookingNoShowUseCase,
    },
    {
      provide: ICreateHoldUseCase,
      useClass: CreateHoldUseCase,
    },
    {
      provide: IConfirmBookingUseCase,
      useClass: ConfirmBookingUseCase,
    },
    {
      provide: IRescheduleBookingUseCase,
      useClass: RescheduleBookingUseCase,
    },
  ],
  exports: [
    IMarkBookingNoShowUseCase,
    ICreateHoldUseCase,
    IConfirmBookingUseCase,
    IRescheduleBookingUseCase,
    IBookingRepositoryToken,
    IBookingHoldRepositoryToken,
    IClinicInvitationPolicyRepositoryToken,
    IRecurrenceRepositoryToken,
    IExternalCalendarEventsRepositoryToken,
  ],
})
export class SchedulingModule {}
