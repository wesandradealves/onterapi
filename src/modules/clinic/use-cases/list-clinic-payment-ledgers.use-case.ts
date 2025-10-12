import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  IClinicAppointmentRepository,
  IClinicAppointmentRepository as IClinicAppointmentRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-appointment.repository.interface';
import {
  ClinicPaymentLedgerListItem,
  IListClinicPaymentLedgersUseCase,
  IListClinicPaymentLedgersUseCase as IListClinicPaymentLedgersUseCaseToken,
  ListClinicPaymentLedgersInput,
} from '../../../domain/clinic/interfaces/use-cases/list-clinic-payment-ledgers.use-case.interface';
import { extractClinicPaymentLedger } from '../utils/clinic-payment-ledger.util';

@Injectable()
export class ListClinicPaymentLedgersUseCase
  extends BaseUseCase<ListClinicPaymentLedgersInput, ClinicPaymentLedgerListItem[]>
  implements IListClinicPaymentLedgersUseCase
{
  protected readonly logger = new Logger(ListClinicPaymentLedgersUseCase.name);

  constructor(
    @Inject(IClinicAppointmentRepositoryToken)
    private readonly clinicAppointmentRepository: IClinicAppointmentRepository,
  ) {
    super();
  }

  protected async handle(
    input: ListClinicPaymentLedgersInput,
  ): Promise<ClinicPaymentLedgerListItem[]> {
    const appointments = await this.clinicAppointmentRepository.listByClinic({
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      paymentStatuses: input.paymentStatuses,
      fromConfirmedAt: input.fromConfirmedAt,
      toConfirmedAt: input.toConfirmedAt,
      limit: input.limit,
      offset: input.offset,
    });

    return appointments.map((appointment) => ({
      appointmentId: appointment.id,
      clinicId: appointment.clinicId,
      tenantId: appointment.tenantId,
      serviceTypeId: appointment.serviceTypeId,
      professionalId: appointment.professionalId,
      paymentStatus: appointment.paymentStatus,
      paymentTransactionId: appointment.paymentTransactionId,
      confirmedAt: appointment.confirmedAt,
      ledger: extractClinicPaymentLedger(appointment.metadata),
    }));
  }
}

export const ListClinicPaymentLedgersUseCaseToken =
  IListClinicPaymentLedgersUseCaseToken;
