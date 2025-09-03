import { Injectable, Logger, Inject } from '@nestjs/common';
import { IRefreshTokenUseCase, RefreshTokenInput, RefreshTokenOutput } from '../../../domain/auth/interfaces/use-cases/refresh-token.use-case.interface';
import { IAuthRepository, IAuthRepositoryToken } from '../../../domain/auth/interfaces/repositories/auth.repository.interface';
import { IJwtService } from '../../../domain/auth/interfaces/services/jwt.service.interface';
import { ISupabaseAuthService } from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { Result } from '../../../shared/types/result.type';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RefreshTokenUseCase implements IRefreshTokenUseCase {
  private readonly logger = new Logger(RefreshTokenUseCase.name);

  constructor(
    @Inject(IAuthRepositoryToken)
    private readonly authRepository: IAuthRepository,
    @Inject(IJwtService)
    private readonly jwtService: IJwtService,
    @Inject(ISupabaseAuthService)
    private readonly supabaseAuthService: ISupabaseAuthService,
  ) {}

  async execute(input: RefreshTokenInput): Promise<Result<RefreshTokenOutput>> {
    try {
      const tokenResult = this.jwtService.verifyRefreshToken(input.refreshToken);
      if (tokenResult.error) {
        return { error: new Error('Refresh token inválido') };
      }

      const sessionUser = await this.authRepository.validateRefreshToken(input.refreshToken);
      if (!sessionUser) {
        this.logger.warn('Refresh token não encontrado ou expirado');
        return { error: new Error('Sessão expirada') };
      }

      const { data: supabaseData, error: userError } = await this.supabaseAuthService.getUserById(sessionUser.id);
      if (userError || !supabaseData) {
        this.logger.error('Erro ao buscar usuário do Supabase', userError);
        return { error: new Error('Usuário não encontrado') };
      }

      const supabaseUser = supabaseData.user || supabaseData;

      const user = {
        id: sessionUser.id,
        email: supabaseUser.email,
        name: supabaseUser.user_metadata?.name,
        role: supabaseUser.user_metadata?.role,
        tenantId: supabaseUser.user_metadata?.tenantId || null,
        isActive: supabaseUser.user_metadata?.isActive !== false,
      };

      if (!user.isActive) {
        await this.authRepository.removeRefreshToken(input.refreshToken);
        return { error: new Error('Conta desativada') };
      }

      const sessionId = uuidv4();
      const accessToken = this.jwtService.generateAccessToken({
        sub: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        sessionId,
      });

      const newRefreshToken = this.jwtService.generateRefreshToken({
        sub: user.id,
        sessionId,
      });

      await this.authRepository.removeRefreshToken(input.refreshToken);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await this.authRepository.saveRefreshToken(
        user.id,
        newRefreshToken,
        expiresAt,
        input.deviceInfo,
      );

      const output: RefreshTokenOutput = {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: 900,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
        },
      };

      this.logger.log(`Token renovado para usuário ${user.email}`);
      return { data: output };
    } catch (error) {
      this.logger.error('Erro ao renovar token', error);
      return { error: error as Error };
    }
  }
}