import { Injectable, Logger, Inject } from '@nestjs/common';
import { IValidateTwoFAUseCase, ValidateTwoFAInput, ValidateTwoFAOutput } from '../../../domain/auth/interfaces/use-cases/validate-two-fa.use-case.interface';
import { IAuthRepository, IAuthRepositoryToken } from '../../../domain/auth/interfaces/repositories/auth.repository.interface';
import { IJwtService } from '../../../domain/auth/interfaces/services/jwt.service.interface';
import { ITwoFactorService } from '../../../domain/auth/interfaces/services/two-factor.service.interface';
import { ISupabaseAuthService } from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { Result } from '../../../shared/types/result.type';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ValidateTwoFAUseCase implements IValidateTwoFAUseCase {
  private readonly logger = new Logger(ValidateTwoFAUseCase.name);

  constructor(
    @Inject(IAuthRepositoryToken)
    private readonly authRepository: IAuthRepository,
    @Inject(IJwtService)
    private readonly jwtService: IJwtService,
    @Inject(ITwoFactorService)
    private readonly twoFactorService: ITwoFactorService,
    @Inject(ISupabaseAuthService)
    private readonly supabaseAuthService: ISupabaseAuthService,
  ) {}

  async execute(input: ValidateTwoFAInput): Promise<Result<ValidateTwoFAOutput>> {
    try {
      const tempTokenResult = this.jwtService.verifyTwoFactorToken(input.tempToken);
      if (tempTokenResult.error) {
        return { error: new Error('Token inválido ou expirado') };
      }

      const userId = tempTokenResult.data.sub;

      const { data: supabaseUser, error: userError } = await this.supabaseAuthService.getUserById(userId);
      if (userError || !supabaseUser) {
        return { error: new Error('Usuário não encontrado') };
      }
      
      const userData = supabaseUser.user || supabaseUser;
      const user = {
        id: userData.id,
        email: userData.email,
        name: userData.user_metadata?.name || userData.email?.split('@')[0],
        role: userData.user_metadata?.role || 'PATIENT',
        tenantId: userData.user_metadata?.tenantId || null,
        twoFactorSecret: null,
      };

      this.logger.warn(`
========================================
🔍 VALIDANDO CÓDIGO 2FA
📧 Email: ${user.email}
🔢 Código recebido: ${input.code}
========================================
      `);
      
      const isValidCode = await this.validateCode(user.id, user.twoFactorSecret!, input.code);
      if (!isValidCode) {
        this.logger.warn(`❌ Código 2FA inválido para usuário ${user.email}`);
        return { error: new Error('Código inválido') };
      }
      
      this.logger.warn(`✅ Código 2FA válido! Gerando tokens de acesso...`);

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

      const { error: updateError } = await this.supabaseAuthService.updateUserMetadata(user.id, {
        ...user,
        lastLoginAt: new Date().toISOString(),
      });

      if (updateError) {
        this.logger.error('Erro ao atualizar lastLoginAt no Supabase', updateError);
      }

      const output: ValidateTwoFAOutput = {
        accessToken,
        refreshToken,
        expiresIn: 900,
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
    if (secret && this.twoFactorService.verifyTOTP(secret, code)) {
      return true;
    }

    return await this.authRepository.validateTwoFactorCode(userId, code);
  }
}