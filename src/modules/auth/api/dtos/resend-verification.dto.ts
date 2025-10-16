import { ApiProperty } from '@nestjs/swagger';

export class ResendVerificationEmailDto {
  @ApiProperty({
    description: 'Email do usu rio que receber  o link de verifica  o',
    example: 'usuario@example.com',
  })
  email!: string;
}

export class ResendVerificationEmailResponseDto {
  @ApiProperty({ description: 'Indica se o email foi entregue', example: true })
  delivered!: boolean;

  @ApiProperty({ description: 'Indica se o email j  estava verificado', example: false })
  alreadyVerified!: boolean;

  @ApiProperty({
    description: 'Mensagem de retorno para o usu rio',
    example: 'Email de verifica  o enviado',
  })
  message!: string;
}
