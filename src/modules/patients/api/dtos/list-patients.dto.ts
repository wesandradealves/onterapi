import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListPatientsQueryDto {
  @ApiPropertyOptional({ description: 'Pagina atual (base 1)', example: 1 })
  page?: number;

  @ApiPropertyOptional({ description: 'Quantidade por pagina', example: 25 })
  limit?: number;

  @ApiPropertyOptional({ description: 'Campo para ordenacao', example: 'fullName' })
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Direcao da ordenacao',
    example: 'asc',
    enum: ['asc', 'desc'],
  })
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ description: 'Busca livre por nome/CPF', example: 'Maria' })
  query?: string;

  @ApiPropertyOptional({
    description: 'Status do paciente',
    example: ['active', 'in_treatment'],
    isArray: true,
    type: String,
  })
  status?: string[];

  @ApiPropertyOptional({
    description: 'Nivel de risco',
    example: ['medium'],
    isArray: true,
    type: String,
  })
  riskLevel?: string[];

  @ApiPropertyOptional({
    description: 'IDs de profissionais associados',
    example: ['b3a1f6b6-6f14-4f42-8c4a-bf508f124d55'],
    isArray: true,
    type: String,
  })
  professionalIds?: string[];

  @ApiPropertyOptional({
    description: 'Tags do paciente',
    example: ['VIP'],
    isArray: true,
    type: String,
  })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Filtro rapido predefinido',
    example: 'inactive_30_days',
    enum: ['inactive_30_days', 'no_anamnesis', 'needs_follow_up', 'birthday_week'],
  })
  quickFilter?: string;

  @ApiPropertyOptional({
    description: 'Tenant override (opcional)',
    example: 'd8c3ab8a-1234-4a5b-8c5e-0123456789ab',
  })
  tenantId?: string;
}
