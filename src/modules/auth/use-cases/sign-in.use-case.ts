import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISignInUseCase, SignInInput, SignInOutput } from '@domain/auth/interfaces/use-cases/sign-in.use-case.interface';
import { IAuthRepository } from '@domain/auth/interfaces/repositories/auth.repository.interface';
import { ISupabaseAuthService } from '@domain/auth/interfaces/services/supabase-auth.service.interface';
import { IJwtService } from '@domain/auth/interfaces/services/jwt.service.interface';
import { Result } from '@shared/types/result.type';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SignInUseCase implements ISignInUseCase {
  private readonly logger = new Logger(SignInUseCase.name);

  constructor(
    @Inject(IAuthRepository)
    private readonly authRepository: IAuthRepository,
    @Inject(ISupabaseAuthService)
    private readonly supabaseAuthService: ISupabaseAuthService,
    @Inject(IJwtService)
    private readonly jwtService: IJwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(input: SignInInput): Promise<Result<SignInOutput>> {
    try {
      // Verificar se usuário está bloqueado
      const isLocked = await this.authRepository.isUserLocked(input.email);
      if (isLocked) {
        return { error: new Error('Conta bloqueada temporariamente. Tente novamente mais tarde') };
      }

      // Autenticar com Supabase
      const supabaseResult = await this.supabaseAuthService.signIn(
        input.email,
        input.password,
      );

      if (supabaseResult.error) {
        await this.authRepository.incrementFailedAttempts(input.email);
        this.logger.warn(`Login falhou para ${input.email}: ${supabaseResult.error.message}`);
        return { error: new Error('Credenciais inválidas') };
      }

      // Buscar usuário no banco local
      const user = await this.authRepository.findBySupabaseId(supabaseResult.data.user.id);
      if (!user) {
        this.logger.error(`Usuário não encontrado no banco local: ${supabaseResult.data.user.id}`);
        return { error: new Error('Usuário não encontrado') };
      }

      // Verificar se usuário está ativo
      if (!user.isActive) {
        return { error: new Error('Conta desativada') };
      }

      // Resetar tentativas de login
      await this.authRepository.resetFailedAttempts(input.email);

      // Verificar se precisa 2FA
      if (user.twoFactorEnabled) {
        const tempToken = this.jwtService.generateTwoFactorToken(user.id);
        
        return {
          data: {
            requiresTwoFactor: true,
            tempToken,
          },
        };
      }

      // Gerar tokens
      const sessionId = uuidv4();
      const accessToken = this.jwtService.generateAccessToken({
        sub: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        sessionId,
      });

      const refreshToken = this.jwtService.generateRefreshToken({
        sub: user.id,
        sessionId,
      });

      // Salvar refresh token
      const refreshExpiry = input.rememberMe ? 30 : 7; // dias
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + refreshExpiry);

      await this.authRepository.saveRefreshToken(
        user.id,
        refreshToken,
        expiresAt,
        input.deviceInfo,
      );

      // Atualizar último login
      await this.authRepository.update(user.id, {
        lastLoginAt: new Date(),
      });

      const output: SignInOutput = {
        accessToken,
        refreshToken,
        expiresIn: 900, // 15 minutos em segundos
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
        },
      };

      this.logger.log(`Login bem-sucedido para ${user.email}`);
      return { data: output };
    } catch (error) {
      this.logger.error('Erro no login', error);
      return { error: error as Error };
    }
  }
}