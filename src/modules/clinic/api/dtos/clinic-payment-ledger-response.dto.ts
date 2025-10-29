import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  ClinicPaymentLedger,
  ClinicPaymentLedgerChargeback,
  ClinicPaymentLedgerEventEntry,
  ClinicPaymentLedgerRefund,
  ClinicPaymentLedgerSettlement,
  ClinicPaymentSplitAllocation,
  ClinicPaymentStatus,
} from '../../../../domain/clinic/types/clinic.types';

export class ClinicPaymentSplitAllocationDto implements ClinicPaymentSplitAllocation {
  @ApiProperty({ enum: ['taxes', 'gateway', 'clinic', 'professional', 'platform'] })
  recipient!: ClinicPaymentSplitAllocation['recipient'];

  @ApiProperty()
  percentage!: number;

  @ApiProperty()
  amountCents!: number;
}

export class ClinicPaymentLedgerEventDto implements ClinicPaymentLedgerEventEntry {
  @ApiProperty({ enum: ['status_changed', 'settled', 'refunded', 'chargeback'] })
  type!: ClinicPaymentLedgerEventEntry['type'];

  @ApiProperty()
  gatewayStatus!: string;

  @ApiPropertyOptional()
  eventType?: string;

  @ApiProperty()
  recordedAt!: string;

  @ApiPropertyOptional()
  fingerprint?: string;

  @ApiProperty()
  sandbox!: boolean;

  @ApiPropertyOptional({ type: Object })
  metadata?: Record<string, unknown>;
}

export class ClinicPaymentLedgerSettlementDto implements ClinicPaymentLedgerSettlement {
  @ApiProperty()
  settledAt!: string;

  @ApiProperty()
  baseAmountCents!: number;

  @ApiPropertyOptional()
  netAmountCents?: number;

  @ApiProperty({ type: [ClinicPaymentSplitAllocationDto] })
  split!: ClinicPaymentSplitAllocationDto[];

  @ApiProperty()
  remainderCents!: number;

  @ApiPropertyOptional()
  fingerprint?: string;

  @ApiProperty()
  gatewayStatus!: string;
}

export class ClinicPaymentLedgerRefundDto implements ClinicPaymentLedgerRefund {
  @ApiProperty()
  refundedAt!: string;

  @ApiPropertyOptional()
  amountCents?: number;

  @ApiPropertyOptional()
  netAmountCents?: number;

  @ApiPropertyOptional()
  fingerprint?: string;

  @ApiProperty()
  gatewayStatus!: string;
}

export class ClinicPaymentLedgerChargebackDto implements ClinicPaymentLedgerChargeback {
  @ApiProperty()
  chargebackAt!: string;

  @ApiPropertyOptional()
  amountCents?: number;

  @ApiPropertyOptional()
  netAmountCents?: number;

  @ApiPropertyOptional()
  fingerprint?: string;

  @ApiProperty()
  gatewayStatus!: string;
}

export class ClinicPaymentLedgerDto implements ClinicPaymentLedger {
  @ApiProperty()
  currency!: ClinicPaymentLedger['currency'];

  @ApiProperty()
  lastUpdatedAt!: string;

  @ApiProperty({ type: [ClinicPaymentLedgerEventDto] })
  events!: ClinicPaymentLedgerEventDto[];

  @ApiPropertyOptional({ type: ClinicPaymentLedgerSettlementDto })
  settlement?: ClinicPaymentLedgerSettlementDto;

  @ApiPropertyOptional({ type: ClinicPaymentLedgerRefundDto })
  refund?: ClinicPaymentLedgerRefundDto;

  @ApiPropertyOptional({ type: ClinicPaymentLedgerChargebackDto })
  chargeback?: ClinicPaymentLedgerChargebackDto;

  @ApiPropertyOptional({ type: Object })
  metadata?: Record<string, unknown>;
}

export class ClinicPaymentLedgerResponseDto {
  @ApiProperty()
  appointmentId!: string;

  @ApiProperty()
  clinicId!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ enum: ['approved', 'settled', 'refunded', 'chargeback', 'failed'] })
  paymentStatus!: ClinicPaymentStatus;

  @ApiProperty()
  paymentTransactionId!: string;

  @ApiProperty({ type: ClinicPaymentLedgerDto })
  ledger!: ClinicPaymentLedgerDto;
}
