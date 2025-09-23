import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

import { PatientRiskLevel, PatientStatus } from '../../../../domain/patients/types/patient.types';

const PATIENT_STATUS_VALUES: PatientStatus[] = ['new', 'active', 'inactive', 'in_treatment', 'finished'];
const PATIENT_RISK_LEVEL_VALUES: PatientRiskLevel[] = ['low', 'medium', 'high'];
const PATIENT_QUICK_FILTER_VALUES = ['inactive_30_days', 'no_anamnesis', 'needs_follow_up', 'birthday_week'] as const;
type PatientQuickFilter = typeof PATIENT_QUICK_FILTER_VALUES[number];

const normalizeToArray = <T extends string>(value?: T | T[]): T[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return Array.isArray(value) ? value : [value];
};

export class ListPatientsQueryDto {
  @ApiPropertyOptional({ description: 'Página atual (base 1)', example: 1 })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Quantidade por página', example: 25 })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Campo para ordenação', example: 'fullName' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Direção da ordenação', example: 'asc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ description: 'Busca livre por nome/CPF', example: 'Maria' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: 'Status do paciente',
    example: ['active', 'in_treatment'],
    enum: PATIENT_STATUS_VALUES,
    enumName: 'PatientStatus',
    isArray: true,
  })
  @IsOptional()
  @Transform(({ value }) => normalizeToArray<PatientStatus>(value as PatientStatus | PatientStatus[]))
  @IsIn(PATIENT_STATUS_VALUES, { each: true })
  status?: PatientStatus[];

  @ApiPropertyOptional({
    description: 'Nível de risco do paciente',
    example: ['medium'],
    enum: PATIENT_RISK_LEVEL_VALUES,
    enumName: 'PatientRiskLevel',
    isArray: true,
  })
  @IsOptional()
  @Transform(({ value }) => normalizeToArray<PatientRiskLevel>(value as PatientRiskLevel | PatientRiskLevel[]))
  @IsIn(PATIENT_RISK_LEVEL_VALUES, { each: true })
  riskLevel?: PatientRiskLevel[];

  @ApiPropertyOptional({
    description: 'IDs de profissionais associados',
    example: ['b3a1f6b6-6f14-4f42-8c4a-bf508f124d55'],
    isArray: true,
    type: String,
  })
  @IsOptional()
  @Transform(({ value }) => normalizeToArray<string>(value as string | string[]))
  @IsUUID('4', { each: true })
  professionalIds?: string[];

  @ApiPropertyOptional({
    description: 'Tags do paciente',
    example: ['VIP'],
    isArray: true,
    type: String,
  })
  @IsOptional()
  @Transform(({ value }) => normalizeToArray<string>(value as string | string[]))
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Filtro rápido predefinido',
    example: 'inactive_30_days',
    enum: PATIENT_QUICK_FILTER_VALUES,
    enumName: 'PatientQuickFilter',
  })
  @IsOptional()
  @IsIn(PATIENT_QUICK_FILTER_VALUES)
  quickFilter?: PatientQuickFilter;

  @ApiPropertyOptional({
    description: 'Tenant override (opcional)',
    example: 'd8c3ab8a-1234-4a5b-8c5e-0123456789ab',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4')
  tenantId?: string;
}
