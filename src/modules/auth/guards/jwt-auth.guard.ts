import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IJwtService } from '../../../domain/auth/interfaces/services/jwt.service.interface';
import { ISupabaseAuthService } from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

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
      throw new UnauthorizedException('Token não fornecido');
    }

    const tokenResult = this.jwtService.verifyAccessToken(token);
    if (tokenResult.error) {
      this.logger.warn('Token inválido ou expirado');
      throw new UnauthorizedException('Token inválido');
    }

    const userResult = await this.supabaseAuthService.getUserById(tokenResult.data.sub);
    if (userResult.error || !userResult.data) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    const userData = userResult.data;
    
    this.logger.log(`User data from Supabase: ${JSON.stringify(userData)}`);
    
    const actualUser = (userData as any).user || userData;
    const metadata = actualUser.user_metadata || {};
    
    this.logger.log(`User metadata: ${JSON.stringify(metadata)}`);
    
    if (actualUser.banned_until) {
      throw new UnauthorizedException('Conta desativada');
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