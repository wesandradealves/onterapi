import { ApiProperty } from '@nestjs/swagger';
import { RolesEnum } from '../../../../domain/auth/enums/roles.enum';

export class CreateUserInputDTO {
  @ApiProperty({ description: 'Email do usuario', example: 'usuario@email.com' })
  email!: string;

  @ApiProperty({
    description: 'Senha forte (minimo 8 caracteres, maiuscula, minuscula, numero e especial)',
    example: 'SenhaForte123!'
  })
  password!: string;

  @ApiProperty({ description: 'Nome completo do usuario', example: 'Joao Silva' })
  name!: string;

  @ApiProperty({ description: 'CPF sem formatacao (apenas numeros)', example: '12345678901' })
  cpf!: string;

  @ApiProperty({ description: 'Telefone com DDD (apenas numeros)', example: '11999999999', required: false })
  phone?: string;

  @ApiProperty({
    description: 'Role/Perfil do usuario no sistema',
    enum: RolesEnum,
    example: RolesEnum.PATIENT
  })
  role!: RolesEnum;

  @ApiProperty({
    description: 'ID do tenant (clinica) ao qual o usuario pertence',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false
  })
  tenantId?: string;
}

export class CreateUserResponseDto {
  @ApiProperty({ description: 'ID unico do usuario', example: '550e8400-e29b-41d4-a716-446655440001' })
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

  @ApiProperty({ description: 'Role/Perfil do usuario', enum: RolesEnum, example: RolesEnum.PATIENT })
  role!: RolesEnum;

  @ApiProperty({
    description: 'ID do tenant (clinica)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false
  })
  tenantId?: string;

  @ApiProperty({ description: 'Indica se o usuario esta ativo', example: true })
  isActive!: boolean;

  @ApiProperty({ description: 'Indica se o email foi verificado', example: false })
  emailVerified!: boolean;

  @ApiProperty({ description: 'Indica se 2FA esta habilitado', example: false })
  twoFactorEnabled!: boolean;

  @ApiProperty({ description: 'Data de criacao', example: '2025-01-09T10:00:00Z' })
  createdAt!: Date;

  @ApiProperty({ description: 'Data da ultima atualizacao', example: '2025-01-09T10:00:00Z' })
  updatedAt!: Date;
}
