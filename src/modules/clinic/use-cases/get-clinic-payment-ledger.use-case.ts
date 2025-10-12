import { Inject, Injectable, Logger } from '@nestjs/common';

import { BaseUseCase } from '../../../shared/use-cases/base.use-case';
import {
  IClinicAppointmentRepository,
  IClinicAppointmentRepository as IClinicAppointmentRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-appointment.repository.interface';
import {
  GetClinicPaymentLedgerInput,
  GetClinicPaymentLedgerOutput,
  IGetClinicPaymentLedgerUseCase,
  IGetClinicPaymentLedgerUseCase as IGetClinicPaymentLedgerUseCaseToken,
} from '../../../domain/clinic/interfaces/use-cases/get-clinic-payment-ledger.use-case.interface';
import { ClinicErrorFactory } from '../../../shared/factories/clinic-error.factory';
import { extractClinicPaymentLedger } from '../utils/clinic-payment-ledger.util';

@Injectable()
export class GetClinicPaymentLedgerUseCase
  extends BaseUseCase<GetClinicPaymentLedgerInput, GetClinicPaymentLedgerOutput>
  implements IGetClinicPaymentLedgerUseCase
{
  protected readonly logger = new Logger(GetClinicPaymentLedgerUseCase.name);

  constructor(
    @Inject(IClinicAppointmentRepositoryToken)
    private readonly clinicAppointmentRepository: IClinicAppointmentRepository,
  ) {
    super();
  }

  protected async handle(
    input: GetClinicPaymentLedgerInput,
  ): Promise<GetClinicPaymentLedgerOutput> {
    const appointment = await this.clinicAppointmentRepository.findById(
      input.appointmentId,
    );

    if (
      !appointment ||
      appointment.clinicId !== input.clinicId ||
      appointment.tenantId !== input.tenantId
    ) {
      throw ClinicErrorFactory.paymentRecordNotFound(
        'Agendamento da clinica nao encontrado para os parametros informados',
      );
    }

    const ledger = extractClinicPaymentLedger(appointment.metadata);

    return {
      appointmentId: appointment.id,
      clinicId: appointment.clinicId,
      tenantId: appointment.tenantId,
      paymentStatus: appointment.paymentStatus,
      paymentTransactionId: appointment.paymentTransactionId,
      ledger,
    };
  }
}

export const GetClinicPaymentLedgerUseCaseToken =
  IGetClinicPaymentLedgerUseCaseToken;
