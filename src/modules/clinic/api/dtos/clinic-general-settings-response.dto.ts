import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ClinicConfigurationTelemetryResponseDto } from './clinic-configuration-response.dto';

export class ClinicGeneralSettingsDocumentDto {
  @ApiProperty({ enum: ['cnpj', 'cpf', 'mei'] })
  type!: string;

  @ApiProperty()
  value!: string;
}

export class ClinicGeneralSettingsAddressDto {
  @ApiProperty()
  zipCode!: string;

  @ApiProperty()
  street!: string;

  @ApiPropertyOptional()
  number?: string;

  @ApiPropertyOptional()
  complement?: string;

  @ApiPropertyOptional()
  district?: string;

  @ApiProperty()
  city!: string;

  @ApiProperty()
  state!: string;

  @ApiPropertyOptional()
  country?: string;
}

export class ClinicGeneralSettingsContactDto {
  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  whatsapp?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  website?: string;

  @ApiPropertyOptional({ type: [String] })
  socialLinks?: string[];
}

export class ClinicGeneralSettingsPayloadDto {
  @ApiProperty()
  tradeName!: string;

  @ApiPropertyOptional()
  legalName?: string;

  @ApiPropertyOptional({ type: ClinicGeneralSettingsDocumentDto })
  document?: ClinicGeneralSettingsDocumentDto;

  @ApiPropertyOptional()
  stateRegistration?: string;

  @ApiPropertyOptional()
  municipalRegistration?: string;

  @ApiPropertyOptional({ description: 'ISO timestamp' })
  foundationDate?: string;

  @ApiProperty({ type: ClinicGeneralSettingsAddressDto })
  address!: ClinicGeneralSettingsAddressDto;

  @ApiProperty({ type: ClinicGeneralSettingsContactDto })
  contact!: ClinicGeneralSettingsContactDto;

  @ApiPropertyOptional()
  notes?: string;
}

export class ClinicGeneralSettingsResponseDto {
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

  @ApiProperty({ type: ClinicGeneralSettingsPayloadDto })
  payload!: ClinicGeneralSettingsPayloadDto;
}
