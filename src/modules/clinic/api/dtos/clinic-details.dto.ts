import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ClinicHoldSettingsDto } from './clinic-summary.dto';

export class ClinicDocumentDto {
  @ApiProperty({ enum: ['cnpj', 'cpf', 'mei'] })
  type!: string;

  @ApiProperty()
  value!: string;
}

export class ClinicDetailsDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ enum: ['draft', 'pending', 'active', 'inactive', 'suspended'] })
  status!: string;

  @ApiPropertyOptional({ type: ClinicDocumentDto })
  document?: ClinicDocumentDto;

  @ApiProperty()
  primaryOwnerId!: string;

  @ApiProperty({ type: ClinicHoldSettingsDto })
  holdSettings!: ClinicHoldSettingsDto;

  @ApiProperty({ type: Object, description: 'Versoes de configuracao aplicadas por secao' })
  configurationVersions!: Record<string, string>;

  @ApiPropertyOptional({ type: Object })
  metadata?: Record<string, unknown>;

  @ApiProperty({ type: String })
  createdAt!: Date;

  @ApiProperty({ type: String })
  updatedAt!: Date;

  @ApiPropertyOptional({ type: String })
  deletedAt?: Date;
}
