import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
  Headers,
  Ip,
  Logger,
  UsePipes,
  Get,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';

import { SignInDto, SignInResponseDto } from '../dtos/sign-in.dto';
import { ValidateTwoFADto, ValidateTwoFAResponseDto } from '../dtos/two-fa.dto';
import { RefreshTokenDto, RefreshTokenResponseDto } from '../dtos/refresh.dto';
import { SignOutDto, SignOutResponseDto, MeResponseDto } from '../dtos/sign-out.dto';

import { ISignInUseCase } from '../../../../domain/auth/interfaces/use-cases/sign-in.use-case.interface';
import { ISignOutUseCase } from '../../../../domain/auth/interfaces/use-cases/sign-out.use-case.interface';
import { IRefreshTokenUseCase } from '../../../../domain/auth/interfaces/use-cases/refresh-token.use-case.interface';
import { IValidateTwoFAUseCase } from '../../../../domain/auth/interfaces/use-cases/validate-two-fa.use-case.interface';
import { ISendTwoFAUseCase } from '../../../../domain/auth/interfaces/use-cases/send-two-fa.use-case.interface';

import { ISupabaseAuthService } from '../../../../domain/auth/interfaces/services/supabase-auth.service.interface';

import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { Public } from '../../decorators/public.decorator';
import { CurrentUser, ICurrentUser } from '../../decorators/current-user.decorator';

import { SignInInputDTO, signInInputSchema } from '../schemas/sign-in.schema';
import { ValidateTwoFAInputDTO, validateTwoFAInputSchema } from '../schemas/two-fa.schema';
import { RefreshTokenInputDTO, refreshTokenInputSchema } from '../schemas/refresh.schema';

import { ZodValidationPipe } from '../../../../shared/pipes/zod-validation.pipe';

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
    @Inject(IValidateTwoFAUseCase)
    private readonly validateTwoFAUseCase: IValidateTwoFAUseCase,
    @Inject(ISendTwoFAUseCase)
    private readonly sendTwoFAUseCase: ISendTwoFAUseCase,
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
    - Email de alerta de login bem-sucedido com detalhes do acesso`
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
          rememberMe: false
        }
      },
      example2: {
        summary: 'Login com remember me',
        value: {
          email: 'usuario@example.com',
          password: 'SenhaForte123!',
          rememberMe: true,
          deviceInfo: {
            device: 'Chrome on Windows'
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Login realizado com sucesso',
    type: SignInResponseDto 
  })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  @ApiResponse({ status: 423, description: 'Conta bloqueada' })
  @UsePipes(new ZodValidationPipe(signInInputSchema))
  async signIn(@Body() dto: SignInInputDTO) {
    const input = {
      ...dto,
      deviceInfo: dto.deviceInfo || {},
    };

    const result = await this.signInUseCase.execute(input);

    if (result.error) {
      throw result.error;
    }

    return result.data;
  }

  @Post('two-factor/send')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Enviar código 2FA',
    description: `Envia um novo código de autenticação de dois fatores.
    
    **Funcionalidades:**
    - Gera código de 6 dígitos
    - Valida token temporário
    - Envia código por email (SMS e Authenticator em desenvolvimento)
    - Código expira em 5 minutos
    - Limite de 3 reenvios por sessão
    
    **Emails enviados:**
    - Email com código de verificação 2FA formatado`
  })
  @ApiBody({
    description: 'Token temporário para envio de código',
    schema: {
      type: 'object',
      properties: {
        tempToken: {
          type: 'string',
          description: 'Token temporário recebido no login'
        },
        method: {
          type: 'string',
          enum: ['email', 'sms', 'authenticator'],
          description: 'Método de envio (default: email)'
        }
      },
      required: ['tempToken']
    },
    examples: {
      example1: {
        summary: 'Solicitar envio de código',
        value: {
          tempToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Código enviado com sucesso',
    schema: {
      type: 'object',
      properties: {
        sentTo: { type: 'string', description: 'Endereço mascarado do destinatário' },
        method: { type: 'string', enum: ['email', 'sms', 'authenticator'] },
        expiresIn: { type: 'number', description: 'Tempo de expiração em segundos' },
        attemptsRemaining: { type: 'number', description: 'Tentativas restantes' }
      }
    }
  })
  async sendTwoFactorCode(
    @Body('tempToken') tempToken: string,
    @Body('method') method?: 'email' | 'sms' | 'authenticator',
  ) {
    const result = await this.sendTwoFAUseCase.execute({
      userId: '',
      tempToken,
      method,
    });

    if (result.error) {
      throw result.error;
    }

    return result.data;
  }

  @Post('two-factor/validate')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Validar código 2FA',
    description: 'Valida o código de autenticação de dois fatores enviado por SMS, email ou TOTP'
  })
  @ApiBody({ 
    type: ValidateTwoFADto,
    description: 'Código 2FA para validação',
    examples: {
      example1: {
        summary: 'Validação de código',
        value: {
          tempToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          code: '123456',
          trustDevice: false
        }
      },
      example2: {
        summary: 'Validação com confiança no dispositivo',
        value: {
          tempToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          code: '123456',
          trustDevice: true,
          deviceInfo: {
            device: 'iPhone Safari'
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Código validado com sucesso',
    type: ValidateTwoFAResponseDto 
  })
  @ApiResponse({ status: 401, description: 'Código inválido' })
  @UsePipes(new ZodValidationPipe(validateTwoFAInputSchema))
  async validateTwoFA(@Body() dto: ValidateTwoFAInputDTO) {
    const result = await this.validateTwoFAUseCase.execute({
      ...dto,
      userId: '',
    });

    if (result.error) {
      throw result.error;
    }

    return result.data;
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Renovar token de acesso',
    description: 'Usa o refresh token para obter um novo access token'
  })
  @ApiBody({ 
    type: RefreshTokenDto,
    description: 'Refresh token para renovação',
    examples: {
      example1: {
        summary: 'Renovação de token',
        value: {
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Token renovado com sucesso',
    type: RefreshTokenResponseDto 
  })
  @ApiResponse({ status: 401, description: 'Refresh token inválido' })
  @UsePipes(new ZodValidationPipe(refreshTokenInputSchema))
  async refresh(@Body() dto: RefreshTokenInputDTO) {
    const input = {
      ...dto,
      deviceInfo: dto.deviceInfo || {},
    };

    const result = await this.refreshTokenUseCase.execute(input);

    if (result.error) {
      throw result.error;
    }

    return result.data;
  }

  @Post('sign-out')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Fazer logout',
    description: 'Encerra a sessão do usuário, invalidando tokens'
  })
  @ApiBody({ 
    type: SignOutDto,
    description: 'Opções de logout',
    required: false,
    examples: {
      example1: {
        summary: 'Logout simples',
        value: {}
      },
      example2: {
        summary: 'Logout com refresh token',
        value: {
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        }
      },
      example3: {
        summary: 'Logout em todos dispositivos',
        value: {
          allDevices: true
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Logout realizado com sucesso',
    type: SignOutResponseDto 
  })
  @ApiResponse({ status: 401, description: 'Token inválido ou expirado' })
  async signOut(
    @CurrentUser() user: ICurrentUser,
    @Body() dto?: SignOutDto,
    @Headers('authorization') authorization?: string,
  ) {
    const accessToken = authorization?.replace('Bearer ', '') || '';

    const result = await this.signOutUseCase.execute({
      userId: user.id,
      accessToken,
      refreshToken: dto?.refreshToken,
      allDevices: dto?.allDevices,
    });

    if (result.error) {
      throw result.error;
    }

    return result.data;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Obter dados do usuário autenticado',
    description: 'Retorna as informações do usuário atualmente autenticado'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Dados do usuário',
    type: MeResponseDto 
  })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async me(@CurrentUser() user: ICurrentUser) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      createdAt: new Date().toISOString(),
      emailVerified: true,
      twoFactorEnabled: false,
    };
  }

  @Get('verify-email')
  @Public()
  @ApiOperation({
    summary: 'Verificar email do usuário',
    description: 'Confirma o email do usuário usando o token enviado por email'
  })
  @ApiQuery({
    name: 'token',
    required: true,
    type: String,
    description: 'Token de verificação enviado por email'
  })
  @ApiQuery({
    name: 'email',
    required: true,
    type: String,
    description: 'Email do usuário a ser verificado'
  })
  @ApiResponse({
    status: 200,
    description: 'Email verificado com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Token inválido ou expirado' })
  async verifyEmail(
    @Query('token') token: string,
    @Query('email') email: string,
  ) {
    this.logger.warn(`
========================================
✅ VERIFICANDO EMAIL
📧 Email: ${email}
🔑 Token: ${token}
========================================
    `);

    const tokenResult = await this.supabaseAuthService.verifyEmail(token, email);
    
    if (tokenResult.error) {
      throw new BadRequestException('Token inválido');
    }
    
    const confirmResult = await (this.supabaseAuthService as any).confirmEmailByEmail(email);
    
    if (confirmResult.error) {
      throw new BadRequestException(confirmResult.error.message);
    }

    this.logger.log(`✅ Email verificado com sucesso: ${email}`);

    return {
      success: true,
      message: 'Email verificado com sucesso! Você já pode fazer login.'
    };
  }
}