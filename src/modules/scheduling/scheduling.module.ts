import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IBookingRepositoryToken } from '../../domain/scheduling/interfaces/repositories/booking.repository.interface';
import { IBookingHoldRepositoryToken } from '../../domain/scheduling/interfaces/repositories/booking-hold.repository.interface';
import { IClinicInvitationPolicyRepositoryToken } from '../../domain/scheduling/interfaces/repositories/clinic-invitation-policy.repository.interface';
import { IRecurrenceRepositoryToken } from '../../domain/scheduling/interfaces/repositories/recurrence.repository.interface';
import { IExternalCalendarEventsRepositoryToken } from '../../domain/scheduling/interfaces/repositories/external-calendar-events.repository.interface';
import { IMarkBookingNoShowUseCase } from '../../domain/scheduling/interfaces/use-cases/mark-booking-no-show.use-case.interface';
import { ICancelBookingUseCase } from '../../domain/scheduling/interfaces/use-cases/cancel-booking.use-case.interface';
import { ICreateBookingUseCase } from '../../domain/scheduling/interfaces/use-cases/create-booking.use-case.interface';
import { ICreateHoldUseCase } from '../../domain/scheduling/interfaces/use-cases/create-hold.use-case.interface';
import { IConfirmBookingUseCase } from '../../domain/scheduling/interfaces/use-cases/confirm-booking.use-case.interface';
import { IRescheduleBookingUseCase } from '../../domain/scheduling/interfaces/use-cases/reschedule-booking.use-case.interface';
import { IRecordPaymentStatusUseCase } from '../../domain/scheduling/interfaces/use-cases/record-payment-status.use-case.interface';
import { BookingRepository } from '../../infrastructure/scheduling/repositories/booking.repository';
import { BookingEntity } from '../../infrastructure/scheduling/entities/booking.entity';
import { BookingHoldRepository } from '../../infrastructure/scheduling/repositories/booking-hold.repository';
import { BookingHoldEntity } from '../../infrastructure/scheduling/entities/booking-hold.entity';
import { ClinicInvitationPolicyRepository } from '../../infrastructure/scheduling/repositories/clinic-invitation-policy.repository';
import { ClinicInvitationPolicyEntity } from '../../infrastructure/scheduling/entities/clinic-invitation-policy.entity';
import { RecurrenceRepository } from '../../infrastructure/scheduling/repositories/recurrence.repository';
import { RecurrenceSeriesEntity } from '../../infrastructure/scheduling/entities/recurrence-series.entity';
import { RecurrenceOccurrenceEntity } from '../../infrastructure/scheduling/entities/recurrence-occurrence.entity';
import { ExternalCalendarEventsRepository } from '../../infrastructure/scheduling/repositories/external-calendar-events.repository';
import { ExternalCalendarEventEntity } from '../../infrastructure/scheduling/entities/external-calendar-event.entity';
import { AuthModule } from '../auth/auth.module';
import { MarkBookingNoShowUseCase } from './use-cases/mark-booking-no-show.use-case';
import { CancelBookingUseCase } from './use-cases/cancel-booking.use-case';
import { CreateBookingUseCase } from './use-cases/create-booking.use-case';
import { CreateHoldUseCase } from './use-cases/create-hold.use-case';
import { ConfirmBookingUseCase } from './use-cases/confirm-booking.use-case';
import { RescheduleBookingUseCase } from './use-cases/reschedule-booking.use-case';
import { RecordPaymentStatusUseCase } from './use-cases/record-payment-status.use-case';
import { SchedulingController } from './api/controllers/scheduling.controller';
import { SchedulingBillingService } from './services/scheduling-billing.service';
import { SchedulingMetricsService } from './services/scheduling-metrics.service';
import { SchedulingNotificationService } from './services/scheduling-notification.service';
import { SchedulingEventsSubscriber } from './subscribers/scheduling-events.subscriber';

@Module({
  imports: [
    AuthModule,
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
      provide: ICancelBookingUseCase,
      useClass: CancelBookingUseCase,
    },
    {
      provide: ICreateBookingUseCase,
      useClass: CreateBookingUseCase,
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
    {
      provide: IRecordPaymentStatusUseCase,
      useClass: RecordPaymentStatusUseCase,
    },
    SchedulingBillingService,
    SchedulingMetricsService,
    SchedulingNotificationService,
    SchedulingEventsSubscriber,
  ],
  controllers: [SchedulingController],
  exports: [
    IMarkBookingNoShowUseCase,
    ICancelBookingUseCase,
    ICreateBookingUseCase,
    ICreateHoldUseCase,
    IConfirmBookingUseCase,
    IRescheduleBookingUseCase,
    IRecordPaymentStatusUseCase,
    IBookingRepositoryToken,
    IBookingHoldRepositoryToken,
    IClinicInvitationPolicyRepositoryToken,
    IRecurrenceRepositoryToken,
    IExternalCalendarEventsRepositoryToken,
  ],
})
export class SchedulingModule {}
