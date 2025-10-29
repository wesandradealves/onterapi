import { IAuthRepository } from '../../domain/auth/interfaces/repositories/auth.repository.interface';
import { IJwtService } from '../../domain/auth/interfaces/services/jwt.service.interface';
import { DeviceInfo } from '../types/device.types';
import { AUTH_CONSTANTS } from '../constants/auth.constants';
import { calculateExpirationDate } from '../utils/auth.utils';
import { generateSessionId } from '../factories/auth-response.factory';
import { RolesEnum } from '../../domain/auth/enums/roles.enum';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  expiresAt: Date;
}

export interface TokenGenerationInput {
  userId: string;
  email: string;
  role: RolesEnum;
  tenantId?: string;
  rememberMe?: boolean;
}

export class AuthTokenHelper {
  constructor(
    private readonly jwtService: IJwtService,
    private readonly authRepository: IAuthRepository,
  ) {}

  generateTokenPair(input: TokenGenerationInput): TokenPair {
    const sessionId = generateSessionId();

    const accessToken = this.jwtService.generateAccessToken({
      sub: input.userId,
      email: input.email,
      role: input.role,
      tenantId: input.tenantId ?? '',
      sessionId,
    });

    const refreshToken = this.jwtService.generateRefreshToken({
      sub: input.userId,
      sessionId,
    });

    const refreshExpiry = input.rememberMe
      ? AUTH_CONSTANTS.REFRESH_TOKEN_TRUSTED_EXPIRES_DAYS
      : AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRES_DAYS;

    const expiresAt = calculateExpirationDate(refreshExpiry);

    return {
      accessToken,
      refreshToken,
      sessionId,
      expiresAt,
    };
  }

  async saveRefreshToken(
    userId: string,
    refreshToken: string,
    expiresAt: Date,
    deviceInfo?: DeviceInfo,
  ): Promise<void> {
    await this.authRepository.saveRefreshToken(userId, refreshToken, expiresAt, deviceInfo);
  }

  async generateAndSaveTokens(
    input: TokenGenerationInput,
    deviceInfo: DeviceInfo | undefined,
  ): Promise<TokenPair> {
    const tokens = this.generateTokenPair(input);

    await this.saveRefreshToken(input.userId, tokens.refreshToken, tokens.expiresAt, deviceInfo);

    return tokens;
  }
}
