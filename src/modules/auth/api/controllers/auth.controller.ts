import {
  BadRequestException,
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
import { RefreshTokenDto, RefreshTokenResponseDto } from '../dtos/refresh.dto';
import { MeResponseDto, SignOutDto, SignOutResponseDto } from '../dtos/sign-out.dto';
import { unwrapResult } from '../../../../shared/types/result.type';

import { ISignInUseCase } from '../../../../domain/auth/interfaces/use-cases/sign-in.use-case.interface';
import { ISignOutUseCase } from '../../../../domain/auth/interfaces/use-cases/sign-out.use-case.interface';
import { IRefreshTokenUseCase } from '../../../../domain/auth/interfaces/use-cases/refresh-token.use-case.interface';

import { ISupabaseAuthService } from '../../../../domain/auth/interfaces/services/supabase-auth.service.interface';

import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { Public } from '../../decorators/public.decorator';
import { CurrentUser, ICurrentUser } from '../../decorators/current-user.decorator';

import { SignInInputDTO, signInInputSchema } from '../schemas/sign-in.schema';
import { RefreshTokenInputDTO, refreshTokenInputSchema } from '../schemas/refresh.schema';

import { ZodValidationPipe } from '../../../../shared/pipes/zod-validation.pipe';
import { signOutSchema, SignOutSchemaType } from '../schemas/sign-out.schema';
import { toSignInInput, toRefreshTokenInput, toSignOutInput } from '../mappers/auth-request.mapper';
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
    @Inject(ISupabaseAuthService)
    private readonly supabaseAuthService: ISupabaseAuthService,
  ) {}

  @Post('sign-in')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Autenticar usuÃ¡rio',
    description: `Autentica um usuÃ¡rio com email e senha.

**Funcionalidades:**
- Valida credenciais no Supabase Auth
- Gera tokens JWT (access e refresh)
- Envia email de alerta de login com IP, dispositivo e localizaÃ§Ã£o
- Suporta autenticaÃ§Ã£o em dois fatores (2FA)

**Emails enviados:**
- Email de alerta de login bem-sucedido com detalhes do acesso

**Roles:** PÃºblico`,
  })
  @ApiBody({
    type: SignInDto,
    description: 'Credenciais de autenticaÃ§Ã£o',
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
  @ApiResponse({ status: 401, description: 'Credenciais invÃ¡lidas' })
  @ApiResponse({ status: 423, description: 'Conta bloqueada' })
  async signIn(
    @Body(new ZodValidationPipe(signInInputSchema)) dto: SignInInputDTO,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const input = toSignInInput(dto, { ip, userAgentHeader: userAgent });

    return unwrapResult(await this.signInUseCase.execute(input));
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renovar token de acesso',
    description: `Usa o refresh token para obter um novo access token.

**Roles:** PÃºblico`,
  })
  @ApiBody({
    type: RefreshTokenDto,
    description: 'Refresh token para renovaÃ§Ã£o',
    examples: {
      example1: {
        summary: 'RenovaÃ§Ã£o de token',
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
  @ApiResponse({ status: 401, description: 'Refresh token invÃ¡lido' })
  async refresh(
    @Body(new ZodValidationPipe(refreshTokenInputSchema)) dto: RefreshTokenInputDTO,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const input = toRefreshTokenInput(dto, { ip, userAgentHeader: userAgent });

    return unwrapResult(await this.refreshTokenUseCase.execute(input));
  }

  @Post('sign-out')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Fazer logout',
    description: `Encerra a sessÃ£o do usuÃ¡rio, invalidando tokens.

**Roles:** Qualquer usuÃ¡rio autenticado`,
  })
  @ApiBody({
    type: SignOutDto,
    description: 'OpÃ§Ãµes de logout',
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
  @ApiResponse({ status: 401, description: 'Token invÃ¡lido ou expirado' })
  async signOut(
    @CurrentUser() user: ICurrentUser,
    @Body(new ZodValidationPipe(signOutSchema)) dto: SignOutSchemaType,
    @Headers('authorization') authorization?: string,
  ) {
    const input = toSignOutInput(user.id, dto, authorization);

    return unwrapResult(await this.signOutUseCase.execute(input));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obter dados do usuÃ¡rio autenticado',
    description: `Retorna as informaÃ§Ãµes do usuÃ¡rio atualmente autenticado.

**Roles:** Qualquer usuÃ¡rio autenticado`,
  })
  @ApiResponse({
    status: 200,
    description: 'Dados do usuÃ¡rio',
    type: MeResponseDto,
  })
  @ApiResponse({ status: 401, description: 'NÃ£o autenticado' })
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
    summary: 'Verificar email do usuÃ¡rio',
    description: `Confirma o email do usuÃ¡rio usando o token enviado por email.

**Roles:** PÃºblico`,
  })
  @ApiQuery({
    name: 'token',
    required: true,
    type: String,
    description: 'Token de verificaÃ§Ã£o enviado por email',
  })
  @ApiQuery({
    name: 'email',
    required: true,
    type: String,
    description: 'Email do usuÃ¡rio a ser verificado',
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
  @ApiResponse({ status: 400, description: 'Token invÃ¡lido ou expirado' })
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
      message: 'Email verificado com sucesso! VocÃª jÃ¡ pode fazer login.',
    };
  }
}




