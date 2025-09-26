import { Module, Provider } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { UserEntity } from '../../infrastructure/auth/entities/user.entity';
import { UserSessionEntity } from '../../infrastructure/auth/entities/user-session.entity';
import { UserPermissionEntity } from '../../infrastructure/auth/entities/user-permission.entity';
import { TwoFactorCodeEntity } from '../../infrastructure/auth/entities/two-factor-code.entity';
import { LoginAttemptEntity } from '../../infrastructure/auth/entities/login-attempt.entity';

import { AuthRepository } from '../../infrastructure/auth/repositories/auth.repository';

import { SupabaseAuthService } from '../../infrastructure/auth/services/supabase-auth.service';
import { JwtService } from '../../infrastructure/auth/services/jwt.service';
import { TwoFactorService } from '../../infrastructure/auth/services/two-factor.service';
import { EmailService } from '../../infrastructure/email/services/email.service';
import { AuthEmailService } from '../../infrastructure/email/services/auth-email.service';
import { NotificationEmailService } from '../../infrastructure/email/services/notification-email.service';
import { ISupabaseAuthService } from '../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { IJwtService } from '../../domain/auth/interfaces/services/jwt.service.interface';
import { ITwoFactorService } from '../../domain/auth/interfaces/services/two-factor.service.interface';
import { IEmailService } from '../../domain/auth/interfaces/services/email.service.interface';
import { IAuthRepositoryToken } from '../../domain/auth/interfaces/repositories/auth.repository.interface';

import { SignInUseCase } from './use-cases/sign-in.use-case';
import { SignOutUseCase } from './use-cases/sign-out.use-case';
import { RefreshTokenUseCase } from './use-cases/refresh-token.use-case';
import { ValidateTwoFAUseCase } from './use-cases/validate-two-fa.use-case';
import { SendTwoFAUseCase } from './use-cases/send-two-fa.use-case';
import { ResendVerificationEmailUseCase } from './use-cases/resend-verification-email.use-case';
import { RequestPasswordResetUseCase } from './use-cases/request-password-reset.use-case';
import { ConfirmPasswordResetUseCase } from './use-cases/confirm-password-reset.use-case';
import { ISignInUseCase } from '../../domain/auth/interfaces/use-cases/sign-in.use-case.interface';
import { ISignOutUseCase } from '../../domain/auth/interfaces/use-cases/sign-out.use-case.interface';
import { IRefreshTokenUseCase } from '../../domain/auth/interfaces/use-cases/refresh-token.use-case.interface';
import { IValidateTwoFAUseCase } from '../../domain/auth/interfaces/use-cases/validate-two-fa.use-case.interface';
import { ISendTwoFAUseCase } from '../../domain/auth/interfaces/use-cases/send-two-fa.use-case.interface';
import { IResendVerificationEmailUseCase } from '../../domain/auth/interfaces/use-cases/resend-verification-email.use-case.interface';
import { IRequestPasswordResetUseCase } from '../../domain/auth/interfaces/use-cases/request-password-reset.use-case.interface';
import { IConfirmPasswordResetUseCase } from '../../domain/auth/interfaces/use-cases/confirm-password-reset.use-case.interface';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { TenantGuard } from './guards/tenant.guard';

import { AuthController } from './api/controllers/auth.controller';
import { TwoFactorController } from './api/controllers/two-factor.controller';
import { MessageBus } from '../../shared/messaging/message-bus';
import { AuthEventsSubscriber } from './subscribers/auth-events.subscriber';

const serviceProviders: Provider[] = [
  {
    provide: IAuthRepositoryToken,
    useClass: AuthRepository,
  },
  {
    provide: ISupabaseAuthService,
    useClass: SupabaseAuthService,
  },
  {
    provide: IJwtService,
    useClass: JwtService,
  },
  {
    provide: ITwoFactorService,
    useClass: TwoFactorService,
  },
  {
    provide: IEmailService,
    useClass: EmailService,
  },
];

const useCaseProviders: Provider[] = [
  {
    provide: ISignInUseCase,
    useClass: SignInUseCase,
  },
  {
    provide: ISignOutUseCase,
    useClass: SignOutUseCase,
  },
  {
    provide: IRefreshTokenUseCase,
    useClass: RefreshTokenUseCase,
  },
  {
    provide: IValidateTwoFAUseCase,
    useClass: ValidateTwoFAUseCase,
  },
  {
    provide: ISendTwoFAUseCase,
    useClass: SendTwoFAUseCase,
  },
  {
    provide: IResendVerificationEmailUseCase,
    useClass: ResendVerificationEmailUseCase,
  },
  {
    provide: IRequestPasswordResetUseCase,
    useClass: RequestPasswordResetUseCase,
  },
  {
    provide: IConfirmPasswordResetUseCase,
    useClass: ConfirmPasswordResetUseCase,
  },
];

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      UserEntity,
      UserSessionEntity,
      UserPermissionEntity,
      TwoFactorCodeEntity,
      LoginAttemptEntity,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_ACCESS_SECRET');

        if (!secret) {
          throw new Error('Missing required configuration: JWT_ACCESS_SECRET');
        }

        return {
          secret,
          signOptions: {
            expiresIn: '15m',
          },
        };
      },
    }),
  ],
  controllers: [AuthController, TwoFactorController],
  providers: [
    ...serviceProviders,
    ...useCaseProviders,
    JwtAuthGuard,
    RolesGuard,
    TenantGuard,
    MessageBus,
    AuthEventsSubscriber,
    AuthEmailService,
    NotificationEmailService,
  ],
  exports: [...serviceProviders, JwtAuthGuard, RolesGuard, TenantGuard],
})
export class AuthModule {}
