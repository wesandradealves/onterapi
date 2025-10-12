import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiProperty({ type: ClinicTeamSettingsPayloadDto })
  payload!: ClinicTeamSettingsPayloadDto;
}
