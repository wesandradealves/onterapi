import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { IJwtService } from '../../../domain/auth/interfaces/services/jwt.service.interface';
import {
  AuthTokenPayload,
  RefreshTokenPayload,
  TwoFactorTokenPayload,
} from '../../../domain/auth/types/auth.types';
import { Result } from '../../../shared/types/result.type';

@Injectable()
export class JwtService implements IJwtService {
  private readonly logger = new Logger(JwtService.name);
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly twoFactorSecret: string;

  constructor(
    private readonly nestJwtService: NestJwtService,
    private readonly configService: ConfigService,
  ) {
    this.accessTokenSecret = this.getRequiredSecret('JWT_ACCESS_SECRET');
    this.refreshTokenSecret = this.getRequiredSecret('JWT_REFRESH_SECRET');
    this.twoFactorSecret = this.getRequiredSecret('JWT_2FA_SECRET');
  }

  generateAccessToken(payload: Omit<AuthTokenPayload, 'iat' | 'exp'>): string {
    return this.nestJwtService.sign(payload, {
      secret: this.accessTokenSecret,
      expiresIn: '15m',
    });
  }

  generateRefreshToken(payload: Omit<RefreshTokenPayload, 'iat' | 'exp'>): string {
    return this.nestJwtService.sign(payload, {
      secret: this.refreshTokenSecret,
      expiresIn: '7d',
    });
  }

  generateTwoFactorToken(userId: string): string {
    const payload: Omit<TwoFactorTokenPayload, 'iat' | 'exp'> = {
      sub: userId,
      purpose: 'two-factor',
    };

    return this.nestJwtService.sign(payload, {
      secret: this.twoFactorSecret,
      expiresIn: '5m',
    });
  }

  verifyAccessToken(token: string): Result<AuthTokenPayload> {
    try {
      const payload = this.nestJwtService.verify<AuthTokenPayload>(token, {
        secret: this.accessTokenSecret,
      });
      return { data: payload };
    } catch (error) {
      this.logger.warn('Failed to verify access token', error);
      return { error: error as Error };
    }
  }

  verifyRefreshToken(token: string): Result<RefreshTokenPayload> {
    try {
      const payload = this.nestJwtService.verify<RefreshTokenPayload>(token, {
        secret: this.refreshTokenSecret,
      });
      return { data: payload };
    } catch (error) {
      this.logger.warn('Failed to verify refresh token', error);
      return { error: error as Error };
    }
  }

  verifyTwoFactorToken(token: string): Result<TwoFactorTokenPayload> {
    try {
      const payload = this.nestJwtService.verify<TwoFactorTokenPayload>(token, {
        secret: this.twoFactorSecret,
      });
      return { data: payload };
    } catch (error) {
      this.logger.warn('Failed to verify 2FA token', error);
      return { error: error as Error };
    }
  }

  private getRequiredSecret(envKey: string): string {
    const value = this.configService.get<string>(envKey);

    if (!value) {
      throw new Error('Missing required configuration: ' + envKey);
    }

    return value;
  }

  decode<T = any>(token: string): T | null {
    try {
      return this.nestJwtService.decode(token) as T;
    } catch (error) {
      this.logger.warn('Failed to decode token', error);
      return null;
    }
  }
}
