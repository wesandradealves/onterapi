import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class ListPatientsQueryDto {
  @ApiPropertyOptional({ description: 'P�gina atual (base 1)', example: 1 })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Quantidade por p�gina', example: 25 })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Campo para ordena��o', example: 'full_name' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Dire��o da ordena��o', example: 'asc' })
  @IsOptional()
  @IsString()
  sortOrder?: string;

  @ApiPropertyOptional({ description: 'Busca livre por nome/CPF', example: 'Maria' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ description: 'Status', example: 'active', isArray: true, type: String })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : Array.isArray(value) ? value : [value],
  )
  status?: string[];

  @ApiPropertyOptional({ description: 'Risco', example: 'medium', isArray: true, type: String })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : Array.isArray(value) ? value : [value],
  )
  riskLevel?: string[];

  @ApiPropertyOptional({
    description: 'IDs de profissionais',
    example: ['b3a1f6b6-6f14-4f42-8c4a-bf508f124d55'],
    isArray: true,
    type: String,
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : Array.isArray(value) ? value : [value],
  )
  professionalIds?: string[];

  @ApiPropertyOptional({
    description: 'Tags do paciente',
    example: ['VIP'],
    isArray: true,
    type: String,
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : Array.isArray(value) ? value : [value],
  )
  tags?: string[];

  @ApiPropertyOptional({ description: 'Filtro r�pido', example: 'inactive_30_days' })
  @IsOptional()
  @IsString()
  quickFilter?: string;

  @ApiPropertyOptional({
    description: 'Tenant override (opcional)',
    example: 'd8c3ab8a-1234-4a5b-8c5e-0123456789ab',
  })
  @IsOptional()
  @IsString()
  tenantId?: string;
}
