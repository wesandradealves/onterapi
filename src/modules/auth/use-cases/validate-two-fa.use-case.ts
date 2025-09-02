import { Injectable, Logger, Inject } from '@nestjs/common';
import { IValidateTwoFAUseCase, ValidateTwoFAInput, ValidateTwoFAOutput } from '../../../domain/auth/interfaces/use-cases/validate-two-fa.use-case.interface';
import { IAuthRepository } from '../../../domain/auth/interfaces/repositories/auth.repository.interface';
import { IJwtService } from '../../../domain/auth/interfaces/services/jwt.service.interface';
import { ITwoFactorService } from '../../../domain/auth/interfaces/services/two-factor.service.interface';
import { Result } from '../../../shared/types/result.type';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ValidateTwoFAUseCase implements IValidateTwoFAUseCase {
  private readonly logger = new Logger(ValidateTwoFAUseCase.name);

  constructor(
    @Inject(IAuthRepository)
    private readonly authRepository: IAuthRepository,
    @Inject(IJwtService)
    private readonly jwtService: IJwtService,
    @Inject(ITwoFactorService)
    private readonly twoFactorService: ITwoFactorService,
  ) {}

  async execute(input: ValidateTwoFAInput): Promise<Result<ValidateTwoFAOutput>> {
    try {
      // Verificar token temporário
      const tempTokenResult = this.jwtService.verifyTwoFactorToken(input.tempToken);
      if (tempTokenResult.error) {
        return { error: new Error('Token inválido ou expirado') };
      }

      const userId = tempTokenResult.data.sub;

      // Buscar usuário
      const user = await this.authRepository.findById(userId);
      if (!user) {
        return { error: new Error('Usuário não encontrado') };
      }

      // LOG PARA DESENVOLVIMENTO
      this.logger.warn(`
========================================
🔍 VALIDANDO CÓDIGO 2FA
📧 Email: ${user.email}
🔢 Código recebido: ${input.code}
========================================
      `);
      
      // Validar código 2FA
      const isValidCode = await this.validateCode(user.id, user.twoFactorSecret!, input.code);
      if (!isValidCode) {
        this.logger.warn(`❌ Código 2FA inválido para usuário ${user.email}`);
        return { error: new Error('Código inválido') };
      }
      
      this.logger.warn(`✅ Código 2FA válido! Gerando tokens de acesso...`);

      // Gerar tokens finais
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

      // Salvar sessão
      const expiresAt = new Date();
      const refreshDays = input.trustDevice ? 30 : 7;
      expiresAt.setDate(expiresAt.getDate() + refreshDays);

      await this.authRepository.saveRefreshToken(
        user.id,
        refreshToken,
        expiresAt,
        {
          ...input.deviceInfo,
          trustedDevice: input.trustDevice,
        },
      );

      // Atualizar último login
      await this.authRepository.update(user.id, {
        lastLoginAt: new Date(),
      });

      const output: ValidateTwoFAOutput = {
        accessToken,
        refreshToken,
        expiresIn: 900, // 15 minutos
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
        },
      };

      this.logger.log(`2FA validado com sucesso para ${user.email}`);
      return { data: output };
    } catch (error) {
      this.logger.error('Erro na validação 2FA', error);
      return { error: error as Error };
    }
  }

  private async validateCode(userId: string, secret: string, code: string): Promise<boolean> {
    // Primeiro tenta validar como código TOTP (authenticator app)
    if (secret && this.twoFactorService.verifyTOTP(secret, code)) {
      return true;
    }

    // Se não, tenta validar como código temporário (email/SMS)
    return await this.authRepository.validateTwoFactorCode(userId, code);
  }
}