import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClinicNotificationSettingsQuietHoursDto {
  @ApiProperty()
  start!: string;

  @ApiProperty()
  end!: string;

  @ApiPropertyOptional()
  timezone?: string;
}

export class ClinicNotificationSettingsChannelDto {
  @ApiProperty({ enum: ['email', 'whatsapp', 'sms', 'push', 'in_app'] })
  type!: string;

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty()
  defaultEnabled!: boolean;

  @ApiPropertyOptional({ type: ClinicNotificationSettingsQuietHoursDto })
  quietHours?: ClinicNotificationSettingsQuietHoursDto;
}

export class ClinicNotificationSettingsTemplateVariableDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  required!: boolean;
}

export class ClinicNotificationSettingsTemplateDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  event!: string;

  @ApiProperty({ enum: ['email', 'whatsapp', 'sms', 'push', 'in_app'] })
  channel!: string;

  @ApiProperty()
  version!: string;

  @ApiProperty()
  active!: boolean;

  @ApiPropertyOptional()
  language?: string;

  @ApiPropertyOptional()
  abGroup?: string;

  @ApiProperty({ type: [ClinicNotificationSettingsTemplateVariableDto] })
  variables!: ClinicNotificationSettingsTemplateVariableDto[];
}

export class ClinicNotificationSettingsRuleDto {
  @ApiProperty()
  event!: string;

  @ApiProperty({ type: [String] })
  channels!: string[];

  @ApiProperty()
  enabled!: boolean;
}

export class ClinicNotificationSettingsPayloadDto {
  @ApiProperty({ type: [ClinicNotificationSettingsChannelDto] })
  channels!: ClinicNotificationSettingsChannelDto[];

  @ApiProperty({ type: [ClinicNotificationSettingsTemplateDto] })
  templates!: ClinicNotificationSettingsTemplateDto[];

  @ApiProperty({ type: [ClinicNotificationSettingsRuleDto] })
  rules!: ClinicNotificationSettingsRuleDto[];

  @ApiPropertyOptional({ type: ClinicNotificationSettingsQuietHoursDto })
  quietHours?: ClinicNotificationSettingsQuietHoursDto;

  @ApiPropertyOptional({ type: [String] })
  events?: string[];

  @ApiPropertyOptional({ type: Object })
  metadata?: Record<string, unknown>;
}

export class ClinicNotificationSettingsResponseDto {
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

  @ApiProperty({ description: 'Indica se a configuração é aplicada automaticamente' })
  autoApply!: boolean;

  @ApiProperty({ type: ClinicNotificationSettingsPayloadDto })
  payload!: ClinicNotificationSettingsPayloadDto;
}
