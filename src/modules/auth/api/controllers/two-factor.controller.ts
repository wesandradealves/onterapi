import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Ip,
  Logger,
  Post,
  UsePipes,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ValidateTwoFADto, ValidateTwoFAResponseDto } from '../dtos/two-fa.dto';
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
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
  ): Promise<ValidateTwoFAResponseDto> {
    const result = await this.validateTwoFAUseCase.execute({
      tempToken: dto.tempToken,
      code: dto.code,
      trustDevice: dto.trustDevice,
      userId: '',
      deviceInfo: {
        ...dto.deviceInfo,
        userAgent,
        ip,
      },
    });

    if (result.error) {
      throw result.error;
    }

    return result.data as ValidateTwoFAResponseDto;
  }

  @Post('send')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reenviar código 2FA',
    description: `Reenvia o código de autenticação de dois fatores.

**Roles:** Público`,
  })
  @ApiResponse({
    status: 200,
    description: MESSAGES.AUTH.TWO_FA_SENT,
  })
  @ApiResponse({
    status: 400,
    description: MESSAGES.ERRORS.AUTH.INVALID_TOKEN,
  })
  @UsePipes(new ZodValidationPipe(sendTwoFAInputSchema))
  async sendTwoFA(@Body() dto: SendTwoFAInputDTO) {
    const result = await this.sendTwoFAUseCase.execute({
      tempToken: dto.tempToken,
      method: dto.method ?? 'email',
      userId: '',
    });

    if (result.error) {
      throw result.error;
    }

    return result.data;
  }
}
