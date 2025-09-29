import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Ip,
  Logger,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { SignInDto, SignInResponseDto } from '../dtos/sign-in.dto';
import {
  ResendVerificationEmailDto,
  ResendVerificationEmailResponseDto,
} from '../dtos/resend-verification.dto';
import {
  RequestPasswordResetDto,
  RequestPasswordResetResponseDto,
} from '../dtos/request-password-reset.dto';
import {
  ConfirmPasswordResetDto,
  ConfirmPasswordResetResponseDto,
} from '../dtos/confirm-password-reset.dto';
import { RefreshTokenDto, RefreshTokenResponseDto } from '../dtos/refresh.dto';
import { MeResponseDto, SignOutDto, SignOutResponseDto } from '../dtos/sign-out.dto';

import { ISignInUseCase } from '../../../../domain/auth/interfaces/use-cases/sign-in.use-case.interface';
import { ISignOutUseCase } from '../../../../domain/auth/interfaces/use-cases/sign-out.use-case.interface';
import { IRefreshTokenUseCase } from '../../../../domain/auth/interfaces/use-cases/refresh-token.use-case.interface';

import { IResendVerificationEmailUseCase } from '../../../../domain/auth/interfaces/use-cases/resend-verification-email.use-case.interface';
import { IRequestPasswordResetUseCase } from '../../../../domain/auth/interfaces/use-cases/request-password-reset.use-case.interface';
import { IConfirmPasswordResetUseCase } from '../../../../domain/auth/interfaces/use-cases/confirm-password-reset.use-case.interface';
import { ISupabaseAuthService } from '../../../../domain/auth/interfaces/services/supabase-auth.service.interface';

import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { Public } from '../../decorators/public.decorator';
import { CurrentUser, ICurrentUser } from '../../decorators/current-user.decorator';

import { SignInInputDTO, signInInputSchema } from '../schemas/sign-in.schema';
import {
  resendVerificationEmailSchema,
  ResendVerificationEmailSchemaType,
} from '../schemas/resend-verification.schema';
import {
  requestPasswordResetSchema,
  RequestPasswordResetSchemaType,
} from '../schemas/request-password-reset.schema';
import {
  confirmPasswordResetSchema,
  ConfirmPasswordResetSchemaType,
} from '../schemas/confirm-password-reset.schema';
import { RefreshTokenInputDTO, refreshTokenInputSchema } from '../schemas/refresh.schema';

import { ZodValidationPipe } from '../../../../shared/pipes/zod-validation.pipe';
import { signOutSchema, SignOutSchemaType } from '../schemas/sign-out.schema';
import {
  toConfirmPasswordResetInput,
  toRefreshTokenInput,
  toRequestPasswordResetInput,
  toResendVerificationEmailInput,
  toSignInInput,
  toSignOutInput,
} from '../mappers/auth-request.mapper';
import { AuthErrorFactory } from '../../../../shared/factories/auth-error.factory';
import {
  maskEmailForLog,
  maskSecret,
  shouldLogSensitiveData,
} from '../../../../shared/utils/logging.utils';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    @Inject(ISignInUseCase)
    private readonly signInUseCase: ISignInUseCase,
    @Inject(ISignOutUseCase)
    private readonly signOutUseCase: ISignOutUseCase,
    @Inject(IRefreshTokenUseCase)
    private readonly refreshTokenUseCase: IRefreshTokenUseCase,
    @Inject(IResendVerificationEmailUseCase)
    private readonly resendVerificationEmailUseCase: IResendVerificationEmailUseCase,
    @Inject(IRequestPasswordResetUseCase)
    private readonly requestPasswordResetUseCase: IRequestPasswordResetUseCase,
    @Inject(IConfirmPasswordResetUseCase)
    private readonly confirmPasswordResetUseCase: IConfirmPasswordResetUseCase,
    @Inject(ISupabaseAuthService)
    private readonly supabaseAuthService: ISupabaseAuthService,
  ) {}
  @Post('sign-in')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Autenticar usuário',
    description: `Autentica um usuário com email e senha.

**Funcionalidades:**
- Valida credenciais no Supabase Auth
- Gera tokens JWT (access e refresh)
- Envia email de alerta de login com IP, dispositivo e localização
- Suporta autenticação em dois fatores (2FA)

**Emails enviados:**
- Email de alerta de login bem-sucedido com detalhes do acesso

**Roles:** Público`,
  })
  @ApiBody({
    type: SignInDto,
    description: 'Credenciais de autenticação',
    examples: {
      example1: {
        summary: 'Login simples',
        value: {
          email: 'usuario@example.com',
          password: 'SenhaForte123!',
          rememberMe: false,
        },
      },
      example2: {
        summary: 'Login com remember me',
        value: {
          email: 'usuario@example.com',
          password: 'SenhaForte123!',
          rememberMe: true,
          deviceInfo: {
            device: 'Chrome on Windows',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login realizado com sucesso',
    type: SignInResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  @ApiResponse({ status: 423, description: 'Conta bloqueada' })
  async signIn(
    @Body(new ZodValidationPipe(signInInputSchema)) dto: SignInInputDTO,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const input = toSignInInput(dto, { ip, userAgentHeader: userAgent });

    return await this.signInUseCase.executeOrThrow(input);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renovar token de acesso',
    description: `Usa o refresh token para obter um novo access token.

**Roles:** Público`,
  })
  @ApiBody({
    type: RefreshTokenDto,
    description: 'Refresh token para renovação',
    examples: {
      example1: {
        summary: 'Renovação de token',
        value: {
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Token renovado com sucesso',
    type: RefreshTokenResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Refresh token inválido' })
  async refresh(
    @Body(new ZodValidationPipe(refreshTokenInputSchema)) dto: RefreshTokenInputDTO,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const input = toRefreshTokenInput(dto, { ip, userAgentHeader: userAgent });

    return await this.refreshTokenUseCase.executeOrThrow(input);
  }

  @Post('verification/resend')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reenviar email de verificacao',
    description: 'Reenvia o link de verificacao para usuarios que ainda nao confirmaram o email.',
  })
  @ApiBody({
    type: ResendVerificationEmailDto,
    examples: {
      default: {
        summary: 'Reenvio padrao',
        value: { email: 'usuario@example.com' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado do reenvio',
    type: ResendVerificationEmailResponseDto,
  })
  async resendVerificationEmail(
    @Body(new ZodValidationPipe(resendVerificationEmailSchema))
    dto: ResendVerificationEmailSchemaType,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
  ) {
    const requestIp = forwardedFor?.split(',')[0]?.trim() || ip;

    const input = toResendVerificationEmailInput(dto, {
      ip: requestIp,
      userAgentHeader: userAgent,
    });

    return await this.resendVerificationEmailUseCase.executeOrThrow(input);
  }

  @Post('password/reset/request')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Solicitar reset de senha',
    description: 'Envia as instrucoes de redefinicao de senha para o email informado.',
  })
  @ApiBody({
    type: RequestPasswordResetDto,
    examples: {
      default: {
        summary: 'Solicitacao padrao',
        value: { email: 'usuario@example.com' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado da solicitacao de reset',
    type: RequestPasswordResetResponseDto,
  })
  async requestPasswordReset(
    @Body(new ZodValidationPipe(requestPasswordResetSchema))
    dto: RequestPasswordResetSchemaType,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
  ) {
    const requestIp = forwardedFor?.split(',')[0]?.trim() || ip;

    const input = toRequestPasswordResetInput(dto, {
      ip: requestIp,
      userAgentHeader: userAgent,
    });

    return await this.requestPasswordResetUseCase.executeOrThrow(input);
  }

  @Post('password/reset/confirm')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirmar reset de senha',
    description: 'Confirma a redefinicao de senha a partir do token enviado pelo Supabase.',
  })
  @ApiBody({
    type: ConfirmPasswordResetDto,
    examples: {
      default: {
        summary: 'Confirmacao padrao',
        value: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          newPassword: 'SenhaForte123!',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Senha redefinida com sucesso',
    type: ConfirmPasswordResetResponseDto,
  })
  async confirmPasswordReset(
    @Body(new ZodValidationPipe(confirmPasswordResetSchema))
    dto: ConfirmPasswordResetSchemaType,
  ) {
    const input = toConfirmPasswordResetInput(dto);

    return await this.confirmPasswordResetUseCase.executeOrThrow(input);
  }
  @Post('sign-out')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Fazer logout',
    description: `Encerra a sessão do usuário, invalidando tokens.

**Roles:** Qualquer usuário autenticado`,
  })
  @ApiBody({
    type: SignOutDto,
    description: 'Opções de logout',
    required: false,
    examples: {
      example1: {
        summary: 'Logout simples',
        value: {},
      },
      example2: {
        summary: 'Logout com refresh token',
        value: {
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
      example3: {
        summary: 'Logout em todos dispositivos',
        value: {
          allDevices: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Logout realizado com sucesso',
    type: SignOutResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Token inválido ou expirado' })
  async signOut(
    @CurrentUser() user: ICurrentUser,
    @Body(new ZodValidationPipe(signOutSchema)) dto: SignOutSchemaType,
    @Headers('authorization') authorization?: string,
  ) {
    const input = toSignOutInput(user.id, dto, authorization);

    return await this.signOutUseCase.executeOrThrow(input);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obter dados do usuário autenticado',
    description: `Retorna as informações do usuário atualmente autenticado.

**Roles:** Qualquer usuário autenticado`,
  })
  @ApiResponse({
    status: 200,
    description: 'Dados do usuário',
    type: MeResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async me(@CurrentUser() user: ICurrentUser) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId ?? null,
      createdAt: user.createdAt,
      emailVerified: user.emailVerified ?? false,
      twoFactorEnabled: user.twoFactorEnabled ?? false,
    };
  }

  @Get('verify-email')
  @Public()
  @ApiOperation({
    summary: 'Verificar email do usuário',
    description: `Confirma o email do usuário usando o token enviado por email.

**Roles:** Público`,
  })
  @ApiQuery({
    name: 'token',
    required: true,
    type: String,
    description: 'Token de verificação enviado por email',
  })
  @ApiQuery({
    name: 'email',
    required: true,
    type: String,
    description: 'Email do usuário a ser verificado',
  })
  @ApiResponse({
    status: 200,
    description: 'Email verificado com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Token inválido ou expirado' })
  async verifyEmail(@Query('token') token: string, @Query('email') email: string) {
    const maskedEmail = maskEmailForLog(email);
    const maskedToken = maskSecret(token, { visiblePrefix: 3, visibleSuffix: 2 });

    const logPayload: Record<string, string> = { email: maskedEmail };

    if (shouldLogSensitiveData()) {
      logPayload.token = maskedToken;
    }

    this.logger.warn('Verificando email do usuario', logPayload);

    const tokenResult = await this.supabaseAuthService.verifyEmail(token, email);

    if (tokenResult.error) {
      throw AuthErrorFactory.invalidToken();
    }

    const confirmResult = await this.supabaseAuthService.confirmEmailByEmail(email);

    if (confirmResult.error) {
      throw AuthErrorFactory.badRequest(confirmResult.error.message);
    }

    this.logger.log('Email verificado com sucesso', { email: maskedEmail });

    return {
      success: true,
      message: 'Email verificado com sucesso! Você já pode fazer login.',
    };
  }
}
