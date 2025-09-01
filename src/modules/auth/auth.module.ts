import { Module, Provider } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Entities
import { UserEntity } from '../../infrastructure/auth/entities/user.entity';
import { UserSessionEntity } from '../../infrastructure/auth/entities/user-session.entity';
import { UserPermissionEntity } from '../../infrastructure/auth/entities/user-permission.entity';
import { TwoFactorCodeEntity } from '../../infrastructure/auth/entities/two-factor-code.entity';
import { LoginAttemptEntity } from '../../infrastructure/auth/entities/login-attempt.entity';

// Repositories
import { AuthRepository } from '../../infrastructure/auth/repositories/auth.repository';
import { IAuthRepository } from '../../domain/auth/interfaces/repositories/auth.repository.interface';

// Services
import { SupabaseAuthService } from '../../infrastructure/auth/services/supabase-auth.service';
import { JwtService } from '../../infrastructure/auth/services/jwt.service';
import { TwoFactorService } from '../../infrastructure/auth/services/two-factor.service';
import { ISupabaseAuthService } from '../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { IJwtService } from '../../domain/auth/interfaces/services/jwt.service.interface';
import { ITwoFactorService } from '../../domain/auth/interfaces/services/two-factor.service.interface';

// Use Cases
import { SignUpUseCase } from './use-cases/sign-up.use-case';
import { SignInUseCase } from './use-cases/sign-in.use-case';
import { SignOutUseCase } from './use-cases/sign-out.use-case';
import { RefreshTokenUseCase } from './use-cases/refresh-token.use-case';
import { ValidateTwoFAUseCase } from './use-cases/validate-two-fa.use-case';
import { ISignUpUseCase } from '../../domain/auth/interfaces/use-cases/sign-up.use-case.interface';
import { ISignInUseCase } from '../../domain/auth/interfaces/use-cases/sign-in.use-case.interface';
import { ISignOutUseCase } from '../../domain/auth/interfaces/use-cases/sign-out.use-case.interface';
import { IRefreshTokenUseCase } from '../../domain/auth/interfaces/use-cases/refresh-token.use-case.interface';
import { IValidateTwoFAUseCase } from '../../domain/auth/interfaces/use-cases/validate-two-fa.use-case.interface';

// Guards
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { TenantGuard } from './guards/tenant.guard';

// Controllers
import { AuthController } from './api/controllers/auth.controller';

// Providers
const repositoryProviders: Provider[] = [
  {
    provide: IAuthRepository,
    useClass: AuthRepository,
  },
];

const serviceProviders: Provider[] = [
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
];

const useCaseProviders: Provider[] = [
  {
    provide: ISignUpUseCase,
    useClass: SignUpUseCase,
  },
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
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET', 'access-secret-key'),
        signOptions: {
          expiresIn: '15m',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    ...repositoryProviders,
    ...serviceProviders,
    ...useCaseProviders,
    JwtAuthGuard,
    RolesGuard,
    TenantGuard,
  ],
  exports: [
    ...repositoryProviders,
    ...serviceProviders,
    JwtAuthGuard,
    RolesGuard,
    TenantGuard,
  ],
})
export class AuthModule {}