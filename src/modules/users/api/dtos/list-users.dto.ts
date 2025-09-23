import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { RolesEnum } from '../../../../domain/auth/enums/roles.enum';
import { UserResponseDto } from './user-response.dto';

export class ListUsersDto {
  @ApiPropertyOptional({ description: 'Pagina da listagem', example: 1, default: 1 })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Limite de resultados por pagina', example: 20, default: 20 })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Filtrar por role/perfil', enum: RolesEnum, example: RolesEnum.PATIENT })
  @IsOptional()
  @IsEnum(RolesEnum)
  role?: RolesEnum;

  @ApiPropertyOptional({ description: 'Filtrar por tenant (clinica)', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID('4')
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por status ativo/inativo', example: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    const normalized = String(value).toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;
}

export class PaginationDto {
  @ApiPropertyOptional({ description: 'Pagina atual', example: 1 })
  page!: number;

  @ApiPropertyOptional({ description: 'Limite de resultados por pagina', example: 20 })
  limit!: number;

  @ApiPropertyOptional({ description: 'Total de registros', example: 100 })
  total!: number;

  @ApiPropertyOptional({ description: 'Total de paginas', example: 5 })
  totalPages!: number;
}

export class ListUsersResponseDto {
  @ApiPropertyOptional({ description: 'Lista de usuarios', type: [UserResponseDto] })
  data!: UserResponseDto[];

  @ApiPropertyOptional({ description: 'Informacoes de paginacao', type: PaginationDto })
  pagination!: PaginationDto;
}
