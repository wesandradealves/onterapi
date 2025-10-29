import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Ip,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBody, ApiExcludeEndpoint, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { ValidateTwoFADto, ValidateTwoFAResponseDto } from '../dtos/two-fa.dto';
import { IValidateTwoFAUseCase } from '../../../../domain/auth/interfaces/use-cases/validate-two-fa.use-case.interface';
import { ISendTwoFAUseCase } from '../../../../domain/auth/interfaces/use-cases/send-two-fa.use-case.interface';

import { Public } from '../../decorators/public.decorator';
import { toSendTwoFAInput, toValidateTwoFAInput } from '../mappers/auth-request.mapper';
import {
  SendTwoFAInputDTO,
  sendTwoFAInputSchema,
  ValidateTwoFAInputDTO,
  validateTwoFAInputSchema,
} from '../schemas/two-fa.schema';
import { ZodValidationPipe } from '../../../../shared/pipes/zod-validation.pipe';
import { MESSAGES } from '../../../../shared/constants/messages.constants';

@ApiTags('Auth - Two Factor')
@Controller('auth/two-factor')
export class TwoFactorController {
  private readonly logger = new Logger(TwoFactorController.name);

  constructor(
    @Inject(IValidateTwoFAUseCase)
    private readonly validateTwoFAUseCase: IValidateTwoFAUseCase,
    @Inject(ISendTwoFAUseCase)
    private readonly sendTwoFAUseCase: ISendTwoFAUseCase,
  ) {}

  @Post('validate')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validar c digo 2FA',
    description: `Valida o c digo de autentica  o de dois fatores e retorna os tokens de acesso.

**Roles:** P blico`,
  })
  @ApiBody({
    type: ValidateTwoFADto,
    description: 'Payload necess rio para validar o c digo 2FA gerado ap s o login.',
    examples: {
      padrao: {
        summary: 'Valida  o padr o',
        value: {
          tempToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          code: '123456',
          trustDevice: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: MESSAGES.AUTH.TWO_FA_VALIDATED,
    type: ValidateTwoFAResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: MESSAGES.AUTH.TWO_FA_INVALID,
  })
  async validateTwoFA(
    @Body(new ZodValidationPipe(validateTwoFAInputSchema)) dto: ValidateTwoFAInputDTO,
    @Req() request: Request,
    @Ip() ip: string,
  ): Promise<ValidateTwoFAResponseDto> {
    const fingerprint = {
      userAgentHeader: request.headers['user-agent'],
      ip,
    };

    const input = toValidateTwoFAInput(dto, fingerprint);

    return (await this.validateTwoFAUseCase.executeOrThrow(input)) as ValidateTwoFAResponseDto;
  }

  @Post('send')
  @ApiExcludeEndpoint()
  @Public()
  @HttpCode(HttpStatus.OK)
  async sendTwoFA(@Body(new ZodValidationPipe(sendTwoFAInputSchema)) dto: SendTwoFAInputDTO) {
    return await this.sendTwoFAUseCase.executeOrThrow(toSendTwoFAInput(dto));
  }
}
