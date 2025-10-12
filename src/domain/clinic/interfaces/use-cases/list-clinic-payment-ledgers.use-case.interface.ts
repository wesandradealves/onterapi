import { Result } from '../../../../shared/types/result.type';
import {
  ClinicPaymentLedger,
  ClinicPaymentStatus,
} from '../../types/clinic.types';

export interface ListClinicPaymentLedgersInput {
  clinicId: string;
  tenantId: string;
  paymentStatuses?: ClinicPaymentStatus[];
  fromConfirmedAt?: Date;
  toConfirmedAt?: Date;
  limit?: number;
  offset?: number;
}

export interface ClinicPaymentLedgerListItem {
  appointmentId: string;
  clinicId: string;
  tenantId: string;
  serviceTypeId: string;
  professionalId: string;
  paymentStatus: ClinicPaymentStatus;
  paymentTransactionId: string;
  confirmedAt: Date;
  ledger: ClinicPaymentLedger;
}

export interface IListClinicPaymentLedgersUseCase {
  execute(
    input: ListClinicPaymentLedgersInput,
  ): Promise<Result<ClinicPaymentLedgerListItem[]>>;
  executeOrThrow(
    input: ListClinicPaymentLedgersInput,
  ): Promise<ClinicPaymentLedgerListItem[]>;
}

export const IListClinicPaymentLedgersUseCase = Symbol(
  'IListClinicPaymentLedgersUseCase',
);
