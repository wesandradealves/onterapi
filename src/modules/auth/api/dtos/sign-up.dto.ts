import { ApiProperty } from '@nestjs/swagger';
import { RolesEnum } from '../../../../domain/auth/enums/roles.enum';

export class SignUpDto {
  @ApiProperty({
    description: 'Email do usuário',
    example: 'user@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'SenhaForte123!',
    minLength: 8,
  })
  password!: string;

  @ApiProperty({
    description: 'Nome completo do usuário',
    example: 'João Silva',
  })
  name!: string;

  @ApiProperty({
    description: 'CPF do usuário (apenas números)',
    example: '12345678901',
    maxLength: 11,
    minLength: 11,
  })
  cpf!: string;

  @ApiProperty({
    description: 'Telefone do usuário',
    example: '11999999999',
    required: false,
  })
  phone?: string;

  @ApiProperty({
    description: 'Role do usuário',
    enum: RolesEnum,
    example: RolesEnum.PATIENT,
  })
  role!: RolesEnum;

  @ApiProperty({
    description: 'ID do tenant (obrigatório para roles de clínica)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  tenantId?: string;

  @ApiProperty({
    description: 'Aceite dos termos de uso',
    example: true,
  })
  acceptTerms!: boolean;
}

export class SignUpResponseDto {
  @ApiProperty({
    description: 'ID do usuário criado',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId!: string;

  @ApiProperty({
    description: 'Email do usuário',
    example: 'user@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Se requer verificação de email',
    example: true,
  })
  requiresEmailVerification!: boolean;
}