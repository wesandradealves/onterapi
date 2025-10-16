import { ApiProperty } from '@nestjs/swagger';
import { DeviceInfo } from '../../../../shared/types/device.types';

export class SignInDto {
  @ApiProperty({
    description: 'Email do usu rio',
    example: 'user@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Senha do usu rio',
    example: 'SenhaForte123!',
  })
  password!: string;

  @ApiProperty({
    description: 'Manter conectado',
    example: false,
    default: false,
    required: false,
  })
  rememberMe?: boolean;

  @ApiProperty({
    description: 'Informa  es do dispositivo',
    required: false,
  })
  deviceInfo?: DeviceInfo;
}

export class SignInResponseDto {
  @ApiProperty({
    description: 'Token de acesso JWT',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: false,
  })
  accessToken?: string;

  @ApiProperty({
    description: 'Refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: false,
  })
  refreshToken?: string;

  @ApiProperty({
    description: 'Tempo de expira  o em segundos',
    example: 900,
    required: false,
  })
  expiresIn?: number;

  @ApiProperty({
    description: 'Se requer autentica  o de dois fatores',
    example: false,
    required: false,
  })
  requiresTwoFactor?: boolean;

  @ApiProperty({
    description: 'Token tempor rio para 2FA',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: false,
  })
  tempToken?: string;

  @ApiProperty({
    description: 'Dados do usu rio autenticado',
    required: false,
  })
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId?: string;
  };
}
