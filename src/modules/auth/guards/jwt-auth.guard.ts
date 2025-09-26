import { ExecutionContext, Inject, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { BaseGuard } from '../../../shared/guards/base.guard';
import { IJwtService } from '../../../domain/auth/interfaces/services/jwt.service.interface';
import {
  ISupabaseAuthService,
  SupabaseMetadata,
  SupabaseUser,
} from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthErrorFactory, AuthErrorType } from '../../../shared/factories/auth-error.factory';
import { MESSAGES } from '../../../shared/constants/messages.constants';
import { buildUserLogPayload, shouldLogSensitiveData } from '../../../shared/utils/logging.utils';
import { AuthTokenPayload } from '../../../domain/auth/types/auth.types';
import { ICurrentUser } from '../decorators/current-user.decorator';

interface RequestWithUser {
  headers: {
    authorization?: string;
  };
  user?: ICurrentUser;
}

type MetadataLike = SupabaseMetadata & Record<string, unknown>;

@Injectable()
export class JwtAuthGuard extends BaseGuard {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @Inject(IJwtService)
    private readonly jwtService: IJwtService,
    @Inject(ISupabaseAuthService)
    private readonly supabaseAuthService: ISupabaseAuthService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw AuthErrorFactory.create(AuthErrorType.TOKEN_NOT_PROVIDED);
    }

    const tokenResult = this.jwtService.verifyAccessToken(token);
    if (tokenResult.error) {
      this.logger.warn(MESSAGES.LOGS.TOKEN_INVALID_OR_EXPIRED);
      throw AuthErrorFactory.create(AuthErrorType.INVALID_TOKEN);
    }

    const userResult = await this.supabaseAuthService.getUserById(tokenResult.data.sub);
    if (userResult.error || !userResult.data) {
      throw AuthErrorFactory.create(AuthErrorType.USER_NOT_FOUND);
    }

    const tokenPayload = tokenResult.data as AuthTokenPayload;
    const userData = userResult.data as SupabaseUser;
    const metadata = (userData.metadata ?? {}) as MetadataLike;

    const resolvedRole = this.resolveString(metadata.role) ?? tokenPayload.role;
    const tenantId =
      this.resolveString(metadata.tenantId ?? metadata['tenant_id']) ??
      tokenPayload.tenantId ??
      null;

    const sanitizedUserLog = buildUserLogPayload({
      id: userData.id,
      email: userData.email,
      role: resolvedRole,
      tenantId,
    });

    this.logger.log('Supabase user retrieved', sanitizedUserLog);

    if (shouldLogSensitiveData()) {
      this.logger.debug('Supabase user metadata keys', { keys: Object.keys(metadata) });
    }

    const bannedUntilValue = this.resolveDate(metadata.bannedUntil ?? metadata['banned_until']);
    const isCurrentlyBanned = Boolean(bannedUntilValue && bannedUntilValue > new Date());

    if (isCurrentlyBanned) {
      throw AuthErrorFactory.create(AuthErrorType.ACCOUNT_DISABLED, {
        userId: userData.id,
        email: userData.email,
        bannedUntil: bannedUntilValue?.toISOString(),
      });
    }

    const emailVerifiedFlag = this.resolveBoolean(
      metadata.emailVerified ?? metadata['email_verified'],
    );
    const emailVerified =
      emailVerifiedFlag !== undefined ? emailVerifiedFlag : userData.emailVerified;

    const isActiveFlag = this.resolveBoolean(metadata.isActive ?? metadata['is_active']);
    const isActive = isActiveFlag !== false;

    const name = this.resolveString(metadata.name) ?? '';

    const twoFactorEnabled =
      this.resolveBoolean(metadata.twoFactorEnabled ?? metadata['two_factor_enabled']) ?? false;

    const lastLoginDate = this.resolveDate(metadata.lastLoginAt ?? metadata['last_login_at']);

    request.user = {
      id: userData.id,
      email: userData.email,
      name,
      role: resolvedRole,
      tenantId,
      sessionId: tokenPayload.sessionId,
      emailVerified,
      isActive,
      bannedUntil: bannedUntilValue,
      twoFactorEnabled,
      createdAt: userData.createdAt.toISOString(),
      updatedAt: userData.updatedAt.toISOString(),
      lastLoginAt: lastLoginDate ? lastLoginDate.toISOString() : null,
      metadata,
    };

    this.logger.debug('Contexto de usuario aplicado', {
      userId: request.user.id,
      role: request.user.role,
      tenantId: request.user.tenantId,
    });

    return true;
  }

  private extractTokenFromHeader(request: RequestWithUser): string | undefined {
    const authorizationHeader = request.headers.authorization ?? '';
    const [type, token] = authorizationHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }

  private resolveString(value: unknown): string | undefined {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    return undefined;
  }

  private resolveBoolean(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'yes', 'y'].includes(normalized)) {
        return true;
      }
      if (['false', '0', 'no', 'n'].includes(normalized)) {
        return false;
      }
    }
    return undefined;
  }

  private resolveDate(value: unknown): Date | null {
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }
      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.valueOf())) {
        return parsed;
      }
    }
    return null;
  }
}
