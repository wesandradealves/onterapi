import { ApiProperty } from '@nestjs/swagger';

export class ResendVerificationEmailDto {
  @ApiProperty({
    description: 'Email do usuário que receberá o link de verificação',
    example: 'usuario@example.com',
  })
  email!: string;
}

export class ResendVerificationEmailResponseDto {
  @ApiProperty({ description: 'Indica se o email foi entregue', example: true })
  delivered!: boolean;

  @ApiProperty({ description: 'Indica se o email já estava verificado', example: false })
  alreadyVerified!: boolean;

  @ApiProperty({
    description: 'Mensagem de retorno para o usuário',
    example: 'Email de verificação enviado',
  })
  message!: string;
}
