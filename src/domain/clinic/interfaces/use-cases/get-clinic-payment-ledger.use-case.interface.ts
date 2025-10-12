import { Result } from '../../../../shared/types/result.type';
import {
  ClinicPaymentLedger,
  ClinicPaymentStatus,
} from '../../types/clinic.types';

export interface GetClinicPaymentLedgerInput {
  tenantId: string;
  clinicId: string;
  appointmentId: string;
}

export interface GetClinicPaymentLedgerOutput {
  appointmentId: string;
  clinicId: string;
  tenantId: string;
  paymentStatus: ClinicPaymentStatus;
  paymentTransactionId: string;
  ledger: ClinicPaymentLedger;
}

export interface IGetClinicPaymentLedgerUseCase {
  execute(
    input: GetClinicPaymentLedgerInput,
  ): Promise<Result<GetClinicPaymentLedgerOutput>>;
  executeOrThrow(
    input: GetClinicPaymentLedgerInput,
  ): Promise<GetClinicPaymentLedgerOutput>;
}

export const IGetClinicPaymentLedgerUseCase = Symbol(
  'IGetClinicPaymentLedgerUseCase',
);
