import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ClinicConfigurationTelemetryResponseDto } from './clinic-configuration-response.dto';

export class ClinicTeamSettingsQuotaDto {
  @ApiProperty({ enum: ['CLINIC_OWNER', 'MANAGER', 'PROFESSIONAL', 'SECRETARY'] })
  role!: string;

  @ApiProperty()
  limit!: number;
}

export class ClinicTeamSettingsPayloadDto {
  @ApiProperty({ type: [ClinicTeamSettingsQuotaDto] })
  quotas!: ClinicTeamSettingsQuotaDto[];

  @ApiProperty()
  allowExternalInvitations!: boolean;

  @ApiProperty({ enum: ['pending_invitation', 'active', 'inactive', 'suspended'] })
  defaultMemberStatus!: string;

  @ApiProperty({ description: 'Bloqueia aceite de convite quando ha pendencias financeiras' })
  requireFinancialClearance!: boolean;

  @ApiPropertyOptional({ type: Object })
  metadata?: Record<string, unknown>;
}

export class ClinicTeamSettingsResponseDto {
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

  @ApiProperty({ type: ClinicTeamSettingsPayloadDto })
  payload!: ClinicTeamSettingsPayloadDto;
}
