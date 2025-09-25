import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

const EXPORT_FORMATS = ['pdf', 'csv', 'excel', 'vcard'] as const;

export class ExportPatientsDto {
  @ApiProperty({
    description: 'Formato desejado',
    enum: EXPORT_FORMATS,
    example: 'csv',
  })
  @IsIn(EXPORT_FORMATS)
  format!: 'pdf' | 'csv' | 'excel' | 'vcard';

  @ApiPropertyOptional({ description: 'IDs de profissionais', isArray: true, type: String })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  professionalIds?: string[];

  @ApiPropertyOptional({ description: 'Status', isArray: true, type: String })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  status?: string[];

  @ApiPropertyOptional({ description: 'Filtro rápido', example: 'inactive_30_days' })
  @IsOptional()
  @IsString()
  quickFilter?: string;

  @ApiPropertyOptional({ description: 'Incluir dados clínicos', example: false })
  @IsOptional()
  @IsBoolean()
  includeMedicalData?: boolean;
}

