import { Injectable, CanActivate, ExecutionContext, Logger, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IJwtService } from '../../../domain/auth/interfaces/services/jwt.service.interface';
import { ISupabaseAuthService } from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthErrorFactory, AuthErrorType } from '../../../shared/factories/auth-error.factory';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @Inject(IJwtService)
    private readonly jwtService: IJwtService,
    @Inject(ISupabaseAuthService)
    private readonly supabaseAuthService: ISupabaseAuthService,
  ) {}

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
      this.logger.warn('Token inválido ou expirado');
      throw AuthErrorFactory.create(AuthErrorType.INVALID_TOKEN);
    }

    const userResult = await this.supabaseAuthService.getUserById(tokenResult.data.sub);
    if (userResult.error || !userResult.data) {
      throw AuthErrorFactory.create(AuthErrorType.USER_NOT_FOUND);
    }

    const userData = userResult.data;
    
    this.logger.log(`User data from Supabase: ${JSON.stringify(userData)}`);
    
    const actualUser = (userData as any).user || userData;
    const metadata = actualUser.user_metadata || {};
    
    this.logger.log(`User metadata: ${JSON.stringify(metadata)}`);
    
    if (actualUser.banned_until) {
      throw AuthErrorFactory.create(AuthErrorType.ACCOUNT_DISABLED);
    }

    request.user = {
      id: actualUser.id,
      email: actualUser.email || '',
      name: metadata.name || '',
      role: metadata.role || 'PATIENT',
      tenantId: metadata.tenantId || null,
      sessionId: tokenResult.data.sessionId,
    };
    
    this.logger.log(`Request user set to: ${JSON.stringify(request.user)}`);

    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}