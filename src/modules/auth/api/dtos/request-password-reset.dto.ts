import { ApiProperty } from '@nestjs/swagger';

export class RequestPasswordResetDto {
  @ApiProperty({
    description: 'Email do usu rio que receber  as instru  es de redefini  o',
    example: 'usuario@example.com',
  })
  email!: string;
}

export class RequestPasswordResetResponseDto {
  @ApiProperty({ description: 'Indica se o email foi entregue', example: true })
  delivered!: boolean;

  @ApiProperty({
    description: 'Mensagem de retorno',
    example: 'Email de recupera  o enviado com sucesso',
  })
  message!: string;
}
