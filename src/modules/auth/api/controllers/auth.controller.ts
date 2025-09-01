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
  @ApiOperation({ summary: 'Cadastrar novo usuário' })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso' })
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
  @ApiOperation({ summary: 'Autenticar usuário' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
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
  @ApiOperation({ summary: 'Validar código 2FA' })
  @ApiResponse({ status: 200, description: 'Código validado com sucesso' })
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
  @ApiOperation({ summary: 'Renovar token de acesso' })
  @ApiResponse({ status: 200, description: 'Token renovado com sucesso' })
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
  @ApiOperation({ summary: 'Fazer logout' })
  @ApiResponse({ status: 200, description: 'Logout realizado com sucesso' })
  async signOut(
    @CurrentUser() user: ICurrentUser,
    @Headers('authorization') authorization: string,
    @Body('refreshToken') refreshToken?: string,
    @Body('allDevices') allDevices?: boolean,
  ) {
    const accessToken = authorization?.split(' ')[1] || '';

    const result = await this.signOutUseCase.execute({
      userId: user.id,
      accessToken,
      refreshToken,
      allDevices,
    });

    if (result.error) {
      throw result.error;
    }

    return result.data;
  }

  @Post('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter dados do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Dados do usuário' })
  async me(@CurrentUser() user: ICurrentUser) {
    return user;
  }
}