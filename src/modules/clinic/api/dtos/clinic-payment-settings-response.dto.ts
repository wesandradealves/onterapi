import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ClinicConfigurationTelemetryResponseDto } from './clinic-configuration-response.dto';

export class ClinicPaymentSplitRuleDto {
  @ApiProperty({ enum: ['taxes', 'gateway', 'clinic', 'professional', 'platform'] })
  recipient!: string;

  @ApiProperty()
  percentage!: number;

  @ApiProperty()
  order!: number;
}

export class ClinicPaymentAntifraudDto {
  @ApiProperty()
  enabled!: boolean;

  @ApiPropertyOptional()
  provider?: string;

  @ApiPropertyOptional()
  thresholdAmount?: number;
}

export class ClinicPaymentInadimplencyDto {
  @ApiProperty()
  gracePeriodDays!: number;

  @ApiPropertyOptional()
  penaltyPercentage?: number;

  @ApiPropertyOptional()
  dailyInterestPercentage?: number;

  @ApiPropertyOptional()
  maxRetries?: number;

  @ApiProperty({ type: [String] })
  actions!: string[];
}

export class ClinicPaymentRefundPolicyDto {
  @ApiProperty({ enum: ['automatic', 'manual', 'partial'] })
  type!: string;

  @ApiProperty()
  processingTimeHours!: number;

  @ApiPropertyOptional()
  feePercentage?: number;

  @ApiProperty()
  allowPartialRefund!: boolean;
}

export class ClinicPaymentCancellationPolicyDto {
  @ApiProperty({ enum: ['free', 'percentage', 'no_refund'] })
  type!: string;

  @ApiPropertyOptional()
  windowMinutes?: number;

  @ApiPropertyOptional()
  percentage?: number;

  @ApiPropertyOptional()
  message?: string;
}

export class ClinicPaymentSettingsPayloadDto {
  @ApiProperty({ enum: ['asaas'] })
  provider!: string;

  @ApiProperty()
  credentialsId!: string;

  @ApiProperty()
  sandboxMode!: boolean;

  @ApiProperty({ type: [ClinicPaymentSplitRuleDto] })
  splitRules!: ClinicPaymentSplitRuleDto[];

  @ApiProperty({ enum: ['half_even'] })
  roundingStrategy!: string;

  @ApiProperty({ type: ClinicPaymentAntifraudDto })
  antifraud!: ClinicPaymentAntifraudDto;

  @ApiProperty({ type: ClinicPaymentInadimplencyDto })
  inadimplencyRule!: ClinicPaymentInadimplencyDto;

  @ApiProperty({ type: ClinicPaymentRefundPolicyDto })
  refundPolicy!: ClinicPaymentRefundPolicyDto;

  @ApiProperty({ type: [ClinicPaymentCancellationPolicyDto] })
  cancellationPolicies!: ClinicPaymentCancellationPolicyDto[];

  @ApiPropertyOptional()
  bankAccountId?: string;
}

export class ClinicPaymentSettingsResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  clinicId!: string;

  @ApiProperty()
  section!: string;

  @ApiProperty()
  version!: number;

  @ApiProperty()
  createdBy!: string;

  @ApiProperty({ type: String })
  createdAt!: Date;

  @ApiPropertyOptional({ type: String })
  appliedAt?: Date;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty({ enum: ['idle', 'saving', 'saved', 'error'] })
  state!: 'idle' | 'saving' | 'saved' | 'error';

  @ApiProperty({ description: 'Indica se a configuracao e aplicada automaticamente' })
  autoApply!: boolean;

  @ApiProperty({
    description: 'Telemetria da configuracao',
    type: ClinicConfigurationTelemetryResponseDto,
    required: false,
  })
  telemetry?: ClinicConfigurationTelemetryResponseDto;

  @ApiProperty({ type: ClinicPaymentSettingsPayloadDto })
  payload!: ClinicPaymentSettingsPayloadDto;
}
