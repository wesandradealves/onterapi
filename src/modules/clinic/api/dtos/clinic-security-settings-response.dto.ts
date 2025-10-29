import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ClinicConfigurationTelemetryResponseDto } from './clinic-configuration-response.dto';

export class ClinicSecurityTwoFactorSettingsDto {
  @ApiProperty()
  enabled!: boolean;

  @ApiProperty({ type: [String] })
  requiredRoles!: string[];

  @ApiProperty()
  backupCodesEnabled!: boolean;
}

export class ClinicSecurityPasswordPolicyDto {
  @ApiProperty()
  minLength!: number;

  @ApiProperty()
  requireUppercase!: boolean;

  @ApiProperty()
  requireLowercase!: boolean;

  @ApiProperty()
  requireNumbers!: boolean;

  @ApiProperty()
  requireSpecialCharacters!: boolean;
}

export class ClinicSecuritySessionSettingsDto {
  @ApiProperty()
  idleTimeoutMinutes!: number;

  @ApiProperty()
  absoluteTimeoutMinutes!: number;
}

export class ClinicSecurityLoginAlertsDto {
  @ApiProperty()
  email!: boolean;

  @ApiProperty()
  whatsapp!: boolean;
}

export class ClinicSecurityIpRestrictionsDto {
  @ApiProperty()
  enabled!: boolean;

  @ApiProperty({ type: [String] })
  allowlist!: string[];

  @ApiProperty({ type: [String] })
  blocklist!: string[];
}

export class ClinicSecurityAuditSettingsDto {
  @ApiProperty()
  retentionDays!: number;

  @ApiProperty()
  exportEnabled!: boolean;
}

export class ClinicSecurityComplianceDocumentDto {
  @ApiProperty()
  type!: string;

  @ApiPropertyOptional()
  id?: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  status?: string;

  @ApiPropertyOptional()
  required?: boolean;

  @ApiPropertyOptional({ type: String, nullable: true })
  expiresAt?: Date | null;

  @ApiPropertyOptional({ type: Object })
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ type: String })
  updatedAt?: Date;

  @ApiPropertyOptional()
  updatedBy?: string;
}

export class ClinicSecurityComplianceSettingsDto {
  @ApiProperty({ type: [ClinicSecurityComplianceDocumentDto] })
  documents!: ClinicSecurityComplianceDocumentDto[];
}

export class ClinicSecuritySettingsPayloadDto {
  @ApiProperty({ type: ClinicSecurityTwoFactorSettingsDto })
  twoFactor!: ClinicSecurityTwoFactorSettingsDto;

  @ApiProperty({ type: ClinicSecurityPasswordPolicyDto })
  passwordPolicy!: ClinicSecurityPasswordPolicyDto;

  @ApiProperty({ type: ClinicSecuritySessionSettingsDto })
  session!: ClinicSecuritySessionSettingsDto;

  @ApiProperty({ type: ClinicSecurityLoginAlertsDto })
  loginAlerts!: ClinicSecurityLoginAlertsDto;

  @ApiProperty({ type: ClinicSecurityIpRestrictionsDto })
  ipRestrictions!: ClinicSecurityIpRestrictionsDto;

  @ApiProperty({ type: ClinicSecurityAuditSettingsDto })
  audit!: ClinicSecurityAuditSettingsDto;

  @ApiPropertyOptional({ type: ClinicSecurityComplianceSettingsDto })
  compliance?: ClinicSecurityComplianceSettingsDto;

  @ApiPropertyOptional({ type: Object })
  metadata?: Record<string, unknown>;
}

export class ClinicSecuritySettingsResponseDto {
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

  @ApiProperty({
    description: 'Indica se a configuracao e aplicada automaticamente',
  })
  autoApply!: boolean;

  @ApiProperty({
    description: 'Telemetria da configuracao',
    type: ClinicConfigurationTelemetryResponseDto,
    required: false,
  })
  telemetry?: ClinicConfigurationTelemetryResponseDto;

  @ApiProperty({ type: ClinicSecuritySettingsPayloadDto })
  payload!: ClinicSecuritySettingsPayloadDto;
}
