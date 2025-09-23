import { ApiProperty } from '@nestjs/swagger';
import { DeviceInfo } from '../../../../shared/types/device.types';

export class ValidateTwoFADto {
  @ApiProperty({
    description: 'Token temporário recebido no login',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  tempToken!: string;

  @ApiProperty({
    description: 'Código de 6 dígitos',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  code!: string;

  @ApiProperty({
    description: 'Confiar neste dispositivo',
    example: false,
    default: false,
    required: false,
  })
  trustDevice?: boolean;

  @ApiProperty({
    description: 'Informações do dispositivo',
    required: false,
  })
  deviceInfo?: DeviceInfo;
}

export class ValidateTwoFAResponseDto {
  @ApiProperty({
    description: 'Token de acesso JWT',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'Refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken!: string;

  @ApiProperty({
    description: 'Tempo de expiração em segundos',
    example: 900,
  })
  expiresIn!: number;

  @ApiProperty({
    description: 'Dados do usuário autenticado',
  })
  user!: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId?: string;
  };
}
