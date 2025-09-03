import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { 
  ISendTwoFAUseCase,
  SendTwoFAInput,
  SendTwoFAOutput 
} from '../../../domain/auth/interfaces/use-cases/send-two-fa.use-case.interface';
import { IAuthRepository, IAuthRepositoryToken } from '../../../domain/auth/interfaces/repositories/auth.repository.interface';
import { IEmailService } from '../../../domain/auth/interfaces/services/email.service.interface';
import { ITwoFactorService } from '../../../domain/auth/interfaces/services/two-factor.service.interface';
import { IJwtService } from '../../../domain/auth/interfaces/services/jwt.service.interface';
import { ISupabaseAuthService } from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { Result } from '../../../shared/types/result.type';

@Injectable()
export class SendTwoFAUseCase implements ISendTwoFAUseCase {
  private readonly logger = new Logger(SendTwoFAUseCase.name);

  constructor(
    @Inject(IAuthRepositoryToken)
    private readonly authRepository: IAuthRepository,
    @Inject(IEmailService)
    private readonly emailService: IEmailService,
    @Inject(ITwoFactorService)
    private readonly twoFactorService: ITwoFactorService,
    @Inject(IJwtService)
    private readonly jwtService: IJwtService,
    @Inject(ISupabaseAuthService)
    private readonly supabaseAuthService: ISupabaseAuthService,
  ) {}

  async execute(input: SendTwoFAInput): Promise<Result<SendTwoFAOutput>> {
    try {
      // Decode temp token
      const decodedResult = await this.jwtService.verifyTwoFactorToken(input.tempToken);
      if (!decodedResult || decodedResult.error) {
        return { error: new BadRequestException('Invalid temporary token') };
      }

      // Get user
      const userId = input.userId || decodedResult.data?.sub;
      if (!userId) {
        return { error: new BadRequestException('User ID not found') };
      }
      
      // Buscar usuário do Supabase
      const { data: supabaseUser, error: userError } = await this.supabaseAuthService.getUserById(userId);
      if (userError || !supabaseUser) {
        return { error: new BadRequestException('User not found') };
      }
      
      const userData = supabaseUser.user || supabaseUser;
      const user = {
        id: userData.id,
        email: userData.email,
        name: userData.user_metadata?.name || userData.email?.split('@')[0],
      };

      // Determine send method
      const method = input.method || 'email';

      // Generate 2FA code
      const code = this.generateSixDigitCode();
      
      // LOG PARA DESENVOLVIMENTO - REMOVER EM PRODUÇÃO
      this.logger.warn(`
========================================
🔐 CÓDIGO 2FA GERADO: ${code}
📧 Email: ${user.email}
👤 Usuário: ${user.name}
⏰ Expira em: 5 minutos
========================================
      `);
      
      // Save code to database (expires in 5 minutes)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 5);
      
      await this.authRepository.saveTwoFactorCode(
        user.id,
        code,
        expiresAt,
      );

      // Currently only supporting email
      if (method === 'email') {
        const result = await this.emailService.sendTwoFactorCode({
          to: user.email,
          name: user.name,
          code,
          expiresIn: '5 minutes',
        });

        if (result.error) {
          this.logger.error('Error sending 2FA code', result.error);
          return { error: new BadRequestException('Error sending code. Please try again.') };
        }

        this.logger.log(`2FA code sent to ${user.email}`);

        return {
          data: {
            sentTo: this.maskEmail(user.email),
            method: 'email',
            expiresIn: 300, // 5 minutes in seconds
            attemptsRemaining: 3, // TODO: Implement attempts counter
          }
        };
      }

      // TODO: Implement SMS and authenticator app
      return { 
        error: new BadRequestException(`Method ${method} not yet implemented`) 
      };

    } catch (error) {
      this.logger.error('Error sending 2FA code', error);
      return { error: error as Error };
    }
  }

  private generateSixDigitCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    const maskedLocal = local.length > 2 
      ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
      : local;
    return `${maskedLocal}@${domain}`;
  }
}