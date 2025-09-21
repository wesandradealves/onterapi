import { Injectable, ExecutionContext, Logger, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BaseGuard } from '../../../shared/guards/base.guard';
import { IJwtService } from '../../../domain/auth/interfaces/services/jwt.service.interface';
import { ISupabaseAuthService } from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthErrorFactory, AuthErrorType } from '../../../shared/factories/auth-error.factory';
import { MESSAGES } from '../../../shared/constants/messages.constants';
import { buildUserLogPayload, shouldLogSensitiveData } from '../../../shared/utils/logging.utils';

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

    const request = context.switchToHttp().getRequest();
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

    const userData = userResult.data;

    const sanitizedUserLog = buildUserLogPayload({
      id: (userData as any)?.id,
      email: (userData as any)?.email,
      role: (userData as any)?.user_metadata?.role,
      tenantId: (userData as any)?.user_metadata?.tenantId,
    });

    this.logger.log('Supabase user retrieved', sanitizedUserLog);

    const actualUser = (userData as any).user || userData;
    const metadata = actualUser.user_metadata || {};

    if (shouldLogSensitiveData()) {
      const metadataKeys = Object.keys(metadata);
      this.logger.debug('Supabase user metadata keys', { keys: metadataKeys });
    }

    const bannedUntilRaw = actualUser.banned_until ? new Date(actualUser.banned_until) : null;
    const isCurrentlyBanned = Boolean(bannedUntilRaw && bannedUntilRaw > new Date());

    if (isCurrentlyBanned) {
      throw AuthErrorFactory.create(AuthErrorType.ACCOUNT_DISABLED, {
        userId: actualUser.id,
        email: actualUser.email,
        bannedUntil: bannedUntilRaw?.toISOString(),
      });
    }

    const emailVerified = Boolean(
      actualUser.email_confirmed_at ||
        metadata.emailVerified ||
        metadata.email_verified,
    );

    const isActive = metadata.isActive !== false;

    request.user = {
      id: actualUser.id,
      email: actualUser.email || '',
      name: metadata.name || '',
      role: metadata.role || 'PATIENT',
      tenantId: metadata.tenantId || null,
      sessionId: tokenResult.data.sessionId,
      emailVerified,
      isActive,
      bannedUntil: bannedUntilRaw,
      twoFactorEnabled: metadata.twoFactorEnabled || false,
      createdAt: actualUser.created_at
        ? new Date(actualUser.created_at).toISOString()
        : undefined,
      updatedAt: actualUser.updated_at
        ? new Date(actualUser.updated_at).toISOString()
        : undefined,
      lastLoginAt: actualUser.last_sign_in_at
        ? new Date(actualUser.last_sign_in_at).toISOString()
        : null,
      metadata,
    };

    this.logger.debug('Contexto de usuario aplicado', {
      userId: request.user.id,
      role: request.user.role,
      tenantId: request.user.tenantId,
    });

    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
