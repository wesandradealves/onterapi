import { ApiProperty } from '@nestjs/swagger';
import { ICurrentUser } from '../types/current-user.type';

export class BaseAuthResponseDto {
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
  user!: ICurrentUser;
}