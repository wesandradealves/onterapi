import { ApiProperty } from '@nestjs/swagger';
import { DeviceInfo } from '../../../../shared/types/device.types';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token v lido',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken!: string;

  @ApiProperty({
    description: 'Informa  es do dispositivo',
    required: false,
  })
  deviceInfo?: DeviceInfo;
}

export class RefreshTokenResponseDto {
  @ApiProperty({
    description: 'Novo token de acesso JWT',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'Novo refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken!: string;

  @ApiProperty({
    description: 'Tempo de expira  o em segundos',
    example: 900,
  })
  expiresIn!: number;

  @ApiProperty({
    description: 'Dados do usu rio',
  })
  user!: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId?: string;
  };
}
