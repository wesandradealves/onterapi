import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IJwtService } from '@domain/auth/interfaces/services/jwt.service.interface';
import { IAuthRepository } from '@domain/auth/interfaces/repositories/auth.repository.interface';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @Inject(IJwtService)
    private readonly jwtService: IJwtService,
    @Inject(IAuthRepository)
    private readonly authRepository: IAuthRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Verificar se é rota pública
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

    // Verificar token
    const tokenResult = this.jwtService.verifyAccessToken(token);
    if (tokenResult.error) {
      this.logger.warn('Token inválido ou expirado');
      throw new UnauthorizedException('Token inválido');
    }

    // Buscar usuário
    const user = await this.authRepository.findById(tokenResult.data.sub);
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    // Verificar se usuário está ativo
    if (!user.isActive) {
      throw new UnauthorizedException('Conta desativada');
    }

    // Adicionar usuário ao request
    request.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      sessionId: tokenResult.data.sessionId,
    };

    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}