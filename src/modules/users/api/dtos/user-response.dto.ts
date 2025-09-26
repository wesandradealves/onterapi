import { ApiProperty } from '@nestjs/swagger';
import { RolesEnum } from '../../../../domain/auth/enums/roles.enum';

export class UserResponseDto {
  @ApiProperty({
    description: 'ID unico do usuario',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  id!: string;

  @ApiProperty({ description: 'Slug unico do usuario', example: 'joao-silva' })
  slug!: string;

  @ApiProperty({ description: 'Email do usuario', example: 'usuario@email.com' })
  email!: string;

  @ApiProperty({ description: 'Nome completo do usuario', example: 'Joao Silva' })
  name!: string;

  @ApiProperty({ description: 'CPF mascarado', example: '123.***.***-01' })
  cpf!: string;

  @ApiProperty({ description: 'Telefone com DDD', example: '11999999999', required: false })
  phone?: string;

  @ApiProperty({
    description: 'Role ou perfil do usuario',
    enum: RolesEnum,
    example: RolesEnum.PATIENT,
  })
  role!: RolesEnum;

  @ApiProperty({
    description: 'ID do tenant (clinica)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  tenantId?: string;

  @ApiProperty({ description: 'Indica se o usuario esta ativo', example: true })
  isActive!: boolean;

  @ApiProperty({ description: 'Indica se o email foi verificado', example: false })
  emailVerified!: boolean;

  @ApiProperty({ description: 'Indica se o segundo fator esta habilitado', example: false })
  twoFactorEnabled!: boolean;

  @ApiProperty({
    description: 'Data do ultimo login',
    example: '2025-01-09T09:30:00Z',
    required: false,
  })
  lastLoginAt?: Date;

  @ApiProperty({ description: 'Data de criacao', example: '2025-01-09T10:00:00Z' })
  createdAt!: Date;

  @ApiProperty({ description: 'Data da ultima atualizacao', example: '2025-01-09T10:00:00Z' })
  updatedAt!: Date;
}
