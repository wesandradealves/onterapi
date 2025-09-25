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
import { unwrapResult } from '../../../../shared/types/result.type';
import { IValidateTwoFAUseCase } from '../../../../domain/auth/interfaces/use-cases/validate-two-fa.use-case.interface';
import { ISendTwoFAUseCase } from '../../../../domain/auth/interfaces/use-cases/send-two-fa.use-case.interface';

import { Public } from '../../decorators/public.decorator';\r\nimport { toSendTwoFAInput, toValidateTwoFAInput } from '../mappers/auth-request.mapper';
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
    summary: 'Validar cÃ³digo 2FA',
    description: `Valida o cÃ³digo de autenticaÃ§Ã£o de dois fatores e retorna os tokens de acesso.

**Roles:** PÃºblico`,
  })
  @ApiBody({
    type: ValidateTwoFADto,
    description: 'Payload necessÃ¡rio para validar o cÃ³digo 2FA gerado apÃ³s o login.',
    examples: {
      padrao: {
        summary: 'ValidaÃ§Ã£o padrÃ£o',
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

    return unwrapResult(
      await this.validateTwoFAUseCase.execute(input),
    ) as ValidateTwoFAResponseDto;
  }

  @Post('send')
  @ApiExcludeEndpoint()
  @Public()
  @HttpCode(HttpStatus.OK)
  async sendTwoFA(
    @Body(new ZodValidationPipe(sendTwoFAInputSchema)) dto: SendTwoFAInputDTO,
  ) {
    return unwrapResult(await this.sendTwoFAUseCase.execute(toSendTwoFAInput(dto)));
  }
}



