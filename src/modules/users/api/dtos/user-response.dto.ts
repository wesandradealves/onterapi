import { ApiProperty } from '@nestjs/swagger';
import { RolesEnum } from '../../../../domain/auth/enums/roles.enum';

export class UserResponseDto {
  @ApiProperty({
    description: 'ID único do usuário',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  id!: string;

  @ApiProperty({
    description: 'Email do usuário',
    example: 'usuario@email.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Nome completo do usuário',
    example: 'João Silva',
  })
  name!: string;

  @ApiProperty({
    description: 'CPF mascarado',
    example: '123.***.***-01',
  })
  cpf!: string;

  @ApiProperty({
    description: 'Telefone com DDD',
    example: '11999999999',
    required: false,
  })
  phone?: string;

  @ApiProperty({
    description: 'Role/Perfil do usuário',
    enum: RolesEnum,
    example: RolesEnum.PATIENT,
  })
  role!: RolesEnum;

  @ApiProperty({
    description: 'ID do tenant (clínica)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  tenantId?: string;

  @ApiProperty({
    description: 'Indica se o usuário está ativo',
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({
    description: 'Indica se o email foi verificado',
    example: false,
  })
  emailVerified!: boolean;

  @ApiProperty({
    description: 'Indica se 2FA está habilitado',
    example: false,
  })
  twoFactorEnabled!: boolean;

  @ApiProperty({
    description: 'Data do último login',
    example: '2025-01-09T09:30:00Z',
    required: false,
  })
  lastLoginAt?: Date;

  @ApiProperty({
    description: 'Data de criação',
    example: '2025-01-09T10:00:00Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Data da última atualização',
    example: '2025-01-09T10:00:00Z',
  })
  updatedAt!: Date;
}
