import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISignInUseCase, SignInInput, SignInOutput } from '../../../domain/auth/interfaces/use-cases/sign-in.use-case.interface';
import { IAuthRepository, IAuthRepositoryToken } from '../../../domain/auth/interfaces/repositories/auth.repository.interface';
import { ISupabaseAuthService } from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { IJwtService } from '../../../domain/auth/interfaces/services/jwt.service.interface';
import { IEmailService } from '../../../domain/auth/interfaces/services/email.service.interface';
import { Result } from '../../../shared/types/result.type';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SignInUseCase implements ISignInUseCase {
  private readonly logger = new Logger(SignInUseCase.name);

  constructor(
    @Inject(IAuthRepositoryToken)
    private readonly authRepository: IAuthRepository,
    @Inject(ISupabaseAuthService)
    private readonly supabaseAuthService: ISupabaseAuthService,
    @Inject(IJwtService)
    private readonly jwtService: IJwtService,
    @Inject(IEmailService)
    private readonly emailService: IEmailService,
    private readonly configService: ConfigService,
  ) {}

  async execute(input: SignInInput): Promise<Result<SignInOutput>> {
    try {

      const supabaseResult = await this.supabaseAuthService.signIn(
        input.email,
        input.password,
      );

      if (supabaseResult.error) {
        this.logger.warn(`Login falhou para ${input.email}: ${supabaseResult.error.message}`);
        return { error: new Error('Credenciais inválidas') };
      }

      const supabaseUser = supabaseResult.data.user;
      
      const { data: fullUser } = await this.supabaseAuthService.getUserById(supabaseUser.id);
      this.logger.log(`Full user data: ${JSON.stringify(fullUser)}`);
      
      const userMetadata = fullUser?.user?.user_metadata || fullUser?.user_metadata || {};
      this.logger.log(`User metadata: ${JSON.stringify(userMetadata)}`);
      
      const user = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: userMetadata.name || '',
        role: userMetadata.role || 'PATIENT',
        tenantId: userMetadata.tenantId || null,
        isActive: !(supabaseUser as any).banned_until,
        twoFactorEnabled: userMetadata.twoFactorEnabled || false,
      };
      
      this.logger.log(`Final user role: ${user.role}`);


      if (user.twoFactorEnabled) {
        const tempToken = this.jwtService.generateTwoFactorToken(user.id);
        
        return {
          data: {
            requiresTwoFactor: true,
            tempToken,
          },
        };
      }

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

      const refreshExpiry = input.rememberMe ? 30 : 7;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + refreshExpiry);

      await this.authRepository.saveRefreshToken(
        user.id,
        refreshToken,
        expiresAt,
        input.deviceInfo,
      );

      const output: SignInOutput = {
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

      const loginDate = new Date();
      const loginInfo = {
        to: user.email,
        userName: user.name || user.email.split('@')[0],
        loginDate: loginDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        ipAddress: input.deviceInfo?.ip || 'IP não disponível',
        userAgent: input.deviceInfo?.userAgent || 'Navegador não identificado',
        location: (input.deviceInfo as any)?.location || 'Localização não disponível',
        device: this.parseUserAgent(input.deviceInfo?.userAgent),
      };

      try {
        await this.emailService.sendLoginAlertEmail(loginInfo);
        this.logger.log(`Email de alerta de login enviado para ${user.email}`);
      } catch (emailError) {
        this.logger.error(`Erro ao enviar email de alerta de login: ${emailError}`);
      }

      this.logger.log(`Login bem-sucedido para ${user.email}`);
      return { data: output };
    } catch (error) {
      this.logger.error('Erro no login', error);
      return { error: error as Error };
    }
  }

  private parseUserAgent(userAgent?: string): string {
    if (!userAgent) return 'Dispositivo desconhecido';
    
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Mac')) return 'Mac';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android';
    
    return 'Dispositivo desconhecido';
  }
}