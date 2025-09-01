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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

// DTOs
import { SignUpDto, SignUpResponseDto } from '../dtos/sign-up.dto';
import { SignInDto, SignInResponseDto } from '../dtos/sign-in.dto';
import { ValidateTwoFADto, ValidateTwoFAResponseDto } from '../dtos/two-fa.dto';
import { RefreshTokenDto, RefreshTokenResponseDto } from '../dtos/refresh.dto';
import { SignOutDto, SignOutResponseDto, MeResponseDto } from '../dtos/sign-out.dto';

// Use Cases
import { ISignUpUseCase } from '../../../../domain/auth/interfaces/use-cases/sign-up.use-case.interface';
import { ISignInUseCase } from '../../../../domain/auth/interfaces/use-cases/sign-in.use-case.interface';
import { ISignOutUseCase } from '../../../../domain/auth/interfaces/use-cases/sign-out.use-case.interface';
import { IRefreshTokenUseCase } from '../../../../domain/auth/interfaces/use-cases/refresh-token.use-case.interface';
import { IValidateTwoFAUseCase } from '../../../../domain/auth/interfaces/use-cases/validate-two-fa.use-case.interface';

// Guards and Decorators
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { Public } from '../../decorators/public.decorator';
import { CurrentUser, ICurrentUser } from '../../decorators/current-user.decorator';

// Schemas
import { SignUpInputDTO, signUpInputSchema } from '../schemas/sign-up.schema';
import { SignInInputDTO, signInInputSchema } from '../schemas/sign-in.schema';
import { ValidateTwoFAInputDTO, validateTwoFAInputSchema } from '../schemas/two-fa.schema';
import { RefreshTokenInputDTO, refreshTokenInputSchema } from '../schemas/refresh.schema';

// Pipes
import { ZodValidationPipe } from '../../../../shared/pipes/zod-validation.pipe';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    @Inject(ISignUpUseCase)
    private readonly signUpUseCase: ISignUpUseCase,
    @Inject(ISignInUseCase)
    private readonly signInUseCase: ISignInUseCase,
    @Inject(ISignOutUseCase)
    private readonly signOutUseCase: ISignOutUseCase,
    @Inject(IRefreshTokenUseCase)
    private readonly refreshTokenUseCase: IRefreshTokenUseCase,
    @Inject(IValidateTwoFAUseCase)
    private readonly validateTwoFAUseCase: IValidateTwoFAUseCase,
  ) {}

  @Post('sign-up')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Cadastrar novo usuário',
    description: 'Cria um novo usuário no sistema com validação de CPF único e envio de email de confirmação'
  })
  @ApiBody({ 
    type: SignUpDto,
    description: 'Dados para cadastro do usuário',
    examples: {
      example1: {
        summary: 'Exemplo de cadastro de profissional',
        value: {
          email: 'profissional@clinica.com',
          password: 'SenhaForte123!',
          name: 'Dr. João Silva',
          cpf: '12345678901',
          phone: '11999999999',
          role: 'PROFESSIONAL',
          tenantId: 'clinic-123',
          acceptTerms: true
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Usuário criado com sucesso',
    type: SignUpResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 409, description: 'Email ou CPF já cadastrado' })
  @UsePipes(new ZodValidationPipe(signUpInputSchema))
  async signUp(@Body() dto: SignUpInputDTO) {
    const result = await this.signUpUseCase.execute(dto);

    if (result.error) {
      throw result.error;
    }

    return result.data;
  }

  @Post('sign-in')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Autenticar usuário',
    description: 'Autentica um usuário com email e senha, podendo requerer 2FA'
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
  async signIn(
    @Body() dto: SignInInputDTO,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
  ) {
    const input = {
      ...dto,
      deviceInfo: {
        ...dto.deviceInfo,
        userAgent: dto.deviceInfo?.userAgent || userAgent,
        ip: dto.deviceInfo?.ip || ip,
      },
    };

    const result = await this.signInUseCase.execute(input);

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
  async validateTwoFA(
    @Body() dto: ValidateTwoFAInputDTO,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
  ) {
    const input = {
      ...dto,
      userId: '', // Será extraído do tempToken
      deviceInfo: {
        ...dto.deviceInfo,
        userAgent: dto.deviceInfo?.userAgent || userAgent,
        ip: dto.deviceInfo?.ip || ip,
      },
    };

    const result = await this.validateTwoFAUseCase.execute(input);

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
  async refresh(
    @Body() dto: RefreshTokenInputDTO,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
  ) {
    const input = {
      ...dto,
      deviceInfo: {
        ...dto.deviceInfo,
        userAgent: dto.deviceInfo?.userAgent || userAgent,
        ip: dto.deviceInfo?.ip || ip,
      },
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
    @Headers('authorization') authorization: string,
    @Body() dto?: SignOutDto,
  ) {
    const accessToken = authorization?.split(' ')[1] || '';

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
}