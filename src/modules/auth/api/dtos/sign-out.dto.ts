import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class SignOutDto {
  @ApiProperty({
    description: 'Refresh token para invalidar',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: false,
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @ApiProperty({
    description: 'Fazer logout em todos os dispositivos',
    example: false,
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  allDevices?: boolean;
}

export class SignOutResponseDto {
  @ApiProperty({
    description: 'Mensagem de sucesso',
    example: 'Logout realizado com sucesso',
  })
  message!: string;

  @ApiProperty({
    description: 'NÃºmero de sessÃµes revogadas',
    example: 1,
  })
  revokedSessions!: number;
}

export class MeResponseDto {
  @ApiProperty({
    description: 'ID do usuÃ¡rio',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Email do usuÃ¡rio',
    example: 'usuario@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Nome completo do usuÃ¡rio',
    example: 'JoÃ£o Silva',
  })
  name!: string;

  @ApiProperty({
    description: 'Role do usuÃ¡rio',
    example: 'PROFESSIONAL',
  })
  role!: string;

  @ApiProperty({
    description: 'ID do tenant (clÃ­nica)',
    example: 'clinic-123',
    required: false,
  })
  tenantId?: string;

  @ApiProperty({
    description: 'Data de criaÃ§Ã£o da conta',
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

