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
  UsePipes,
} from '@nestjs/common';
import { ApiBody, ApiExcludeEndpoint, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { ValidateTwoFADto, ValidateTwoFAResponseDto } from '../dtos/two-fa.dto';
import { unwrapResult } from '../../../../shared/types/result.type';
import { IValidateTwoFAUseCase } from '../../../../domain/auth/interfaces/use-cases/validate-two-fa.use-case.interface';
import { ISendTwoFAUseCase } from '../../../../domain/auth/interfaces/use-cases/send-two-fa.use-case.interface';

import { Public } from '../../decorators/public.decorator';
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
    summary: 'Validar código 2FA',
    description: `Valida o código de autenticação de dois fatores e retorna os tokens de acesso.

**Roles:** Público`,
  })
  @ApiBody({
    type: ValidateTwoFADto,
    description: 'Payload necessário para validar o código 2FA gerado após o login.',
    examples: {
      padrao: {
        summary: 'Validação padrão',
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
  @UsePipes(new ZodValidationPipe(validateTwoFAInputSchema))
  async validateTwoFA(
    @Body() dto: ValidateTwoFAInputDTO,
    @Req() request: Request,
    @Ip() ip: string,
  ): Promise<ValidateTwoFAResponseDto> {
    const userAgentHeader = request.headers['user-agent'];
    const resolvedUserAgent =
      dto.deviceInfo?.userAgent ??
      (Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader) ??
      'two-factor-client';

    const resolvedIp = dto.deviceInfo?.ip ?? ip;

    return unwrapResult(
      await this.validateTwoFAUseCase.execute({
        tempToken: dto.tempToken,
        code: dto.code,
        trustDevice: dto.trustDevice,
        userId: '',
        deviceInfo: {
          ...dto.deviceInfo,
          userAgent: resolvedUserAgent,
          ip: resolvedIp,
        },
      }),
    ) as ValidateTwoFAResponseDto;
  }

  @Post('send')
  @ApiExcludeEndpoint()
  @Public()
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(sendTwoFAInputSchema))
  async sendTwoFA(@Body() dto: SendTwoFAInputDTO) {
    return unwrapResult(
      await this.sendTwoFAUseCase.execute({
        tempToken: dto.tempToken,
        method: dto.method ?? 'email',
        userId: '',
      }),
    );
  }
}
