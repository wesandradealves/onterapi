import { ApiProperty } from '@nestjs/swagger';

export class RequestPasswordResetDto {
  @ApiProperty({
    description: 'Email do usuário que receberá as instruções de redefinição',
    example: 'usuario@example.com',
  })
  email!: string;
}

export class RequestPasswordResetResponseDto {
  @ApiProperty({ description: 'Indica se o email foi entregue', example: true })
  delivered!: boolean;

  @ApiProperty({
    description: 'Mensagem de retorno',
    example: 'Email de recuperação enviado com sucesso',
  })
  message!: string;
}
