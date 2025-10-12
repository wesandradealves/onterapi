import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ClinicPaymentStatus } from '../../../../domain/clinic/types/clinic.types';
import {
  ClinicPaymentLedgerChargebackDto,
  ClinicPaymentLedgerDto,
  ClinicPaymentLedgerEventDto,
  ClinicPaymentLedgerRefundDto,
  ClinicPaymentLedgerSettlementDto,
  ClinicPaymentSplitAllocationDto,
} from './clinic-payment-ledger-response.dto';

export class ClinicPaymentLedgerListItemDto {
  @ApiProperty()
  appointmentId!: string;

  @ApiProperty()
  clinicId!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  serviceTypeId!: string;

  @ApiProperty()
  professionalId!: string;

  @ApiProperty({ enum: ['approved', 'settled', 'refunded', 'chargeback', 'failed'] })
  paymentStatus!: ClinicPaymentStatus;

  @ApiProperty()
  paymentTransactionId!: string;

  @ApiProperty()
  confirmedAt!: Date;

  @ApiProperty({ type: ClinicPaymentLedgerDto })
  ledger!: ClinicPaymentLedgerDto;
}

export class ClinicPaymentLedgerListResponseDto {
  @ApiProperty({ type: [ClinicPaymentLedgerListItemDto] })
  items!: ClinicPaymentLedgerListItemDto[];
}

export {
  ClinicPaymentLedgerDto,
  ClinicPaymentLedgerEventDto,
  ClinicPaymentLedgerSettlementDto,
  ClinicPaymentLedgerRefundDto,
  ClinicPaymentLedgerChargebackDto,
  ClinicPaymentSplitAllocationDto,
} from './clinic-payment-ledger-response.dto';
