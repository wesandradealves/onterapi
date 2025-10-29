import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  ClinicCurrency,
  ClinicInvitationChannel,
  ClinicInvitationChannelScope,
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

  @ApiProperty({
    description:
      'Valor de repasse ao profissional. Em percentual o intervalo permitido e de 0 a 100; em valor fixo deve ser maior ou igual a zero seguindo a mesma moeda do preco.',
    minimum: 0,
  })
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

  @ApiProperty({
    enum: ['taxes', 'gateway', 'clinic', 'professional', 'platform'],
    isArray: true,
    minItems: 5,
    maxItems: 5,
    description:
      'Ordem fixa das sobras: impostos -> gateway -> clinica -> profissional -> plataforma. Qualquer divergencia gera erro de validacao.',
  })
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

  @ApiProperty({ enum: ['direct', 'marketplace', 'both'] })
  channelScope!: ClinicInvitationChannelScope;

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

  @ApiPropertyOptional({ type: ClinicInvitationEconomicSummaryDto })
  acceptedEconomicSnapshot?: ClinicInvitationEconomicSummaryDto;

  @ApiPropertyOptional({ type: Object })
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Token bruto do convite (apenas na criacao)' })
  token?: string;

  @ApiProperty({ type: String })
  createdAt!: Date;

  @ApiProperty({ type: String })
  updatedAt!: Date;
}
