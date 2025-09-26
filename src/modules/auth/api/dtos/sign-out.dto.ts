import { ApiProperty } from '@nestjs/swagger';

export class SignOutDto {
  @ApiProperty({
    description: 'Refresh token para invalidar',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: false,
  })
  refreshToken?: string;

  @ApiProperty({
    description: 'Fazer logout em todos os dispositivos',
    example: false,
    default: false,
    required: false,
  })
  allDevices?: boolean;
}

export class SignOutResponseDto {
  @ApiProperty({
    description: 'Mensagem de sucesso',
    example: 'Logout realizado com sucesso',
  })
  message!: string;

  @ApiProperty({
    description: 'Número de sessões revogadas',
    example: 1,
  })
  revokedSessions!: number;
}

export class MeResponseDto {
  @ApiProperty({
    description: 'ID do usuário',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Email do usuário',
    example: 'usuario@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Nome completo do usuário',
    example: 'João Silva',
  })
  name!: string;

  @ApiProperty({
    description: 'Role do usuário',
    example: 'PROFESSIONAL',
  })
  role!: string;

  @ApiProperty({
    description: 'ID do tenant (clínica)',
    example: 'clinic-123',
    required: false,
  })
  tenantId?: string;

  @ApiProperty({
    description: 'Data de criação da conta',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Email verificado',
    example: true,
  })
  emailVerified!: boolean;

  @ApiProperty({
    description: '2FA habilitado',
    example: false,
  })
  twoFactorEnabled!: boolean;
}
