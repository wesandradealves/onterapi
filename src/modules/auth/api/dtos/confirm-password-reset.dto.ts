import { ApiProperty } from '@nestjs/swagger';

export class ConfirmPasswordResetDto {
  @ApiProperty({
    description: 'Token de acesso enviado pelo Supabase',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({ description: 'Nova senha que será definida', example: 'SenhaForte123!' })
  newPassword!: string;

  @ApiProperty({
    description: 'Refresh token associado, se disponível',
    required: false,
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken?: string;
}

export class ConfirmPasswordResetResponseDto {
  @ApiProperty({ description: 'Indica se a senha foi redefinida com sucesso', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Mensagem de retorno', example: 'Senha redefinida com sucesso' })
  message!: string;
}
