import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ClinicConfigurationTelemetryResponseDto } from './clinic-configuration-response.dto';

export class ClinicIntegrationWhatsAppTemplateDto {
  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ['approved', 'pending', 'rejected', 'suspended'] })
  status!: string;

  @ApiPropertyOptional()
  category?: string;

  @ApiPropertyOptional({ type: String })
  lastUpdatedAt?: Date;
}

export class ClinicIntegrationWhatsAppQuietHoursDto {
  @ApiProperty()
  start!: string;

  @ApiProperty()
  end!: string;

  @ApiPropertyOptional()
  timezone?: string;
}

export class ClinicIntegrationWhatsAppSettingsDto {
  @ApiProperty()
  enabled!: boolean;

  @ApiPropertyOptional()
  provider?: string;

  @ApiPropertyOptional()
  businessNumber?: string;

  @ApiPropertyOptional()
  instanceStatus?: string;

  @ApiPropertyOptional()
  qrCodeUrl?: string;

  @ApiProperty({ type: [ClinicIntegrationWhatsAppTemplateDto] })
  templates!: ClinicIntegrationWhatsAppTemplateDto[];

  @ApiPropertyOptional({ type: ClinicIntegrationWhatsAppQuietHoursDto })
  quietHours?: ClinicIntegrationWhatsAppQuietHoursDto;

  @ApiPropertyOptional()
  webhookUrl?: string;
}

export class ClinicIntegrationGoogleCalendarSettingsDto {
  @ApiProperty()
  enabled!: boolean;

  @ApiProperty({ enum: ['one_way', 'two_way'] })
  syncMode!: string;

  @ApiProperty({ enum: ['onterapi_wins', 'google_wins', 'ask_user'] })
  conflictPolicy!: string;

  @ApiProperty()
  requireValidationForExternalEvents!: boolean;

  @ApiPropertyOptional()
  defaultCalendarId?: string;

  @ApiPropertyOptional()
  hidePatientName?: boolean;

  @ApiPropertyOptional()
  prefix?: string;
}

export class ClinicIntegrationEmailTrackingDto {
  @ApiProperty()
  open!: boolean;

  @ApiProperty()
  click!: boolean;

  @ApiProperty()
  bounce!: boolean;
}

export class ClinicIntegrationEmailSettingsDto {
  @ApiProperty()
  enabled!: boolean;

  @ApiPropertyOptional()
  provider?: string;

  @ApiPropertyOptional()
  fromName?: string;

  @ApiPropertyOptional()
  fromEmail?: string;

  @ApiPropertyOptional()
  replyTo?: string;

  @ApiProperty({ type: ClinicIntegrationEmailTrackingDto })
  tracking!: ClinicIntegrationEmailTrackingDto;

  @ApiPropertyOptional({ type: [String] })
  templates?: string[];
}

export class ClinicIntegrationWebhookDto {
  @ApiProperty()
  event!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty()
  active!: boolean;
}

export class ClinicIntegrationSettingsPayloadDto {
  @ApiProperty({ type: ClinicIntegrationWhatsAppSettingsDto })
  whatsapp!: ClinicIntegrationWhatsAppSettingsDto;

  @ApiProperty({ type: ClinicIntegrationGoogleCalendarSettingsDto })
  googleCalendar!: ClinicIntegrationGoogleCalendarSettingsDto;

  @ApiProperty({ type: ClinicIntegrationEmailSettingsDto })
  email!: ClinicIntegrationEmailSettingsDto;

  @ApiProperty({ type: [ClinicIntegrationWebhookDto] })
  webhooks!: ClinicIntegrationWebhookDto[];

  @ApiPropertyOptional({ type: Object })
  metadata?: Record<string, unknown>;
}

export class ClinicIntegrationSettingsResponseDto {
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

  @ApiProperty({ type: ClinicIntegrationSettingsPayloadDto })
  payload!: ClinicIntegrationSettingsPayloadDto;
}
