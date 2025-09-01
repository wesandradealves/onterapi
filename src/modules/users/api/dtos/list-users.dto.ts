import { ApiProperty } from '@nestjs/swagger';
import { RolesEnum } from '../../../../domain/auth/enums/roles.enum';
import { UserResponseDto } from './user-response.dto';

export class ListUsersDto {
  @ApiProperty({
    description: 'Página da listagem',
    example: 1,
    required: false,
    default: 1,
  })
  page?: number;

  @ApiProperty({
    description: 'Limite de resultados por página',
    example: 20,
    required: false,
    default: 20,
  })
  limit?: number;

  @ApiProperty({
    description: 'Filtrar por role/perfil',
    enum: RolesEnum,
    example: RolesEnum.PATIENT,
    required: false,
  })
  role?: RolesEnum;

  @ApiProperty({
    description: 'Filtrar por tenant (clínica)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  tenantId?: string;

  @ApiProperty({
    description: 'Filtrar por status ativo/inativo',
    example: true,
    required: false,
  })
  isActive?: boolean;
}

export class PaginationDto {
  @ApiProperty({
    description: 'Página atual',
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: 'Limite de resultados por página',
    example: 20,
  })
  limit!: number;

  @ApiProperty({
    description: 'Total de registros',
    example: 100,
  })
  total!: number;

  @ApiProperty({
    description: 'Total de páginas',
    example: 5,
  })
  totalPages!: number;
}

export class ListUsersResponseDto {
  @ApiProperty({
    description: 'Lista de usuários',
    type: [UserResponseDto],
  })
  data!: UserResponseDto[];

  @ApiProperty({
    description: 'Informações de paginação',
    type: PaginationDto,
  })
  pagination!: PaginationDto;
}