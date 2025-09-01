import { Injectable, Logger, Inject } from '@nestjs/common';
import { IRefreshTokenUseCase, RefreshTokenInput, RefreshTokenOutput } from '@domain/auth/interfaces/use-cases/refresh-token.use-case.interface';
import { IAuthRepository } from '@domain/auth/interfaces/repositories/auth.repository.interface';
import { IJwtService } from '@domain/auth/interfaces/services/jwt.service.interface';
import { Result } from '@shared/types/result.type';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RefreshTokenUseCase implements IRefreshTokenUseCase {
  private readonly logger = new Logger(RefreshTokenUseCase.name);

  constructor(
    @Inject(IAuthRepository)
    private readonly authRepository: IAuthRepository,
    @Inject(IJwtService)
    private readonly jwtService: IJwtService,
  ) {}

  async execute(input: RefreshTokenInput): Promise<Result<RefreshTokenOutput>> {
    try {
      // Verificar refresh token
      const tokenResult = this.jwtService.verifyRefreshToken(input.refreshToken);
      if (tokenResult.error) {
        return { error: new Error('Refresh token inválido') };
      }

      // Validar refresh token no banco
      const user = await this.authRepository.validateRefreshToken(input.refreshToken);
      if (!user) {
        this.logger.warn('Refresh token não encontrado ou expirado');
        return { error: new Error('Sessão expirada') };
      }

      // Verificar se usuário está ativo
      if (!user.isActive) {
        await this.authRepository.removeRefreshToken(input.refreshToken);
        return { error: new Error('Conta desativada') };
      }

      // Gerar novos tokens
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

      // Remover token antigo
      await this.authRepository.removeRefreshToken(input.refreshToken);

      // Salvar novo refresh token
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
        expiresIn: 900, // 15 minutos
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