import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ClinicConfigurationTelemetryResponseDto } from './clinic-configuration-response.dto';

export class ClinicBrandingPaletteDto {
  @ApiProperty()
  primary!: string;

  @ApiPropertyOptional()
  secondary?: string;

  @ApiPropertyOptional()
  accent?: string;

  @ApiPropertyOptional()
  background?: string;

  @ApiPropertyOptional()
  surface?: string;

  @ApiPropertyOptional()
  text?: string;
}

export class ClinicBrandingTypographyDto {
  @ApiProperty()
  primaryFont!: string;

  @ApiPropertyOptional()
  secondaryFont?: string;

  @ApiPropertyOptional()
  headingWeight?: number;

  @ApiPropertyOptional()
  bodyWeight?: number;
}

export class ClinicBrandingPreviewDto {
  @ApiProperty()
  mode!: string;

  @ApiPropertyOptional({ type: String })
  generatedAt?: Date;

  @ApiPropertyOptional()
  previewUrl?: string;
}

export class ClinicBrandingSettingsPayloadDto {
  @ApiPropertyOptional()
  logoUrl?: string;

  @ApiPropertyOptional()
  darkLogoUrl?: string;

  @ApiPropertyOptional({ type: ClinicBrandingPaletteDto })
  palette?: ClinicBrandingPaletteDto;

  @ApiPropertyOptional({ type: ClinicBrandingTypographyDto })
  typography?: ClinicBrandingTypographyDto;

  @ApiPropertyOptional()
  customCss?: string;

  @ApiProperty()
  applyMode!: string;

  @ApiPropertyOptional({ type: ClinicBrandingPreviewDto })
  preview?: ClinicBrandingPreviewDto;

  @ApiPropertyOptional()
  versionLabel?: string;

  @ApiPropertyOptional({ type: Object })
  metadata?: Record<string, unknown>;
}

export class ClinicBrandingSettingsResponseDto {
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

  @ApiProperty({ type: ClinicBrandingSettingsPayloadDto })
  payload!: ClinicBrandingSettingsPayloadDto;
}
