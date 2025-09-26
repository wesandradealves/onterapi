import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const EXPORT_FORMATS = ['pdf', 'csv', 'excel', 'vcard'] as const;

export class ExportPatientsDto {
  @ApiProperty({
    description: 'Formato desejado',
    enum: EXPORT_FORMATS,
    example: 'csv',
  })
  format!: 'pdf' | 'csv' | 'excel' | 'vcard';

  @ApiPropertyOptional({ description: 'IDs de profissionais', isArray: true, type: String })
  professionalIds?: string[];

  @ApiPropertyOptional({ description: 'Status', isArray: true, type: String })
  status?: string[];

  @ApiPropertyOptional({ description: 'Filtro rapido', example: 'inactive_30_days' })
  quickFilter?: string;

  @ApiPropertyOptional({ description: 'Incluir dados clinicos', example: false })
  includeMedicalData?: boolean;
}
