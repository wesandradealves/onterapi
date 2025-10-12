import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  ClinicCurrency,
  ClinicInvitationChannel,
  ClinicInvitationStatus,
  ClinicPayoutModel,
  ClinicSplitRecipient,
} from '../../../../domain/clinic/types/clinic.types';

export class ClinicEconomicAgreementDto {
  @ApiProperty()
  serviceTypeId!: string;

  @ApiProperty()
  price!: number;

  @ApiProperty({ enum: ['BRL', 'USD', 'EUR'] })
  currency!: ClinicCurrency;

  @ApiProperty({ enum: ['fixed', 'percentage'] })
  payoutModel!: ClinicPayoutModel;

  @ApiProperty()
  payoutValue!: number;
}

export class ClinicInvitationEconomicExampleDto {
  @ApiProperty({ enum: ['BRL', 'USD', 'EUR'] })
  currency!: ClinicCurrency;

  @ApiProperty()
  patientPays!: number;

  @ApiProperty()
  professionalReceives!: number;

  @ApiProperty()
  remainder!: number;
}

export class ClinicInvitationEconomicSummaryDto {
  @ApiProperty({ type: [ClinicEconomicAgreementDto] })
  items!: ClinicEconomicAgreementDto[];

  @ApiProperty({ enum: ['taxes', 'gateway', 'clinic', 'professional', 'platform'], isArray: true })
  orderOfRemainders!: ClinicSplitRecipient[];

  @ApiProperty({ enum: ['half_even'] })
  roundingStrategy!: 'half_even';

  @ApiPropertyOptional({ type: () => [ClinicInvitationEconomicExampleDto] })
  examples?: ClinicInvitationEconomicExampleDto[];
}

export class ClinicInvitationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  clinicId!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiPropertyOptional()
  professionalId?: string;

  @ApiPropertyOptional()
  targetEmail?: string;

  @ApiProperty()
  issuedBy!: string;

  @ApiProperty({ enum: ['pending', 'accepted', 'declined', 'revoked', 'expired'] })
  status!: ClinicInvitationStatus;

  @ApiProperty({ enum: ['email', 'whatsapp'] })
  channel!: ClinicInvitationChannel;

  @ApiProperty({ type: String })
  expiresAt!: Date;

  @ApiPropertyOptional({ type: String })
  acceptedAt?: Date;

  @ApiPropertyOptional()
  acceptedBy?: string;

  @ApiPropertyOptional({ type: String })
  revokedAt?: Date;

  @ApiPropertyOptional()
  revokedBy?: string;

  @ApiPropertyOptional()
  revocationReason?: string;

  @ApiPropertyOptional({ type: String })
  declinedAt?: Date;

  @ApiPropertyOptional()
  declinedBy?: string;

  @ApiProperty({ type: ClinicInvitationEconomicSummaryDto })
  economicSummary!: ClinicInvitationEconomicSummaryDto;

  @ApiPropertyOptional({ type: Object })
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Token bruto do convite (apenas na criação)' })
  token?: string;

  @ApiProperty({ type: String })
  createdAt!: Date;

  @ApiProperty({ type: String })
  updatedAt!: Date;
}
