import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesEnum, ROLE_HIERARCHY } from '../../../domain/auth/enums/roles.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Obter roles requeridas
    const requiredRoles = this.reflector.getAllAndOverride<RolesEnum[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    // Verificar hierarquia de roles
    const userLevel = ROLE_HIERARCHY[user.role as RolesEnum] ?? 0;
    const hasPermission = requiredRoles.some(role => {
      const requiredLevel = ROLE_HIERARCHY[role] ?? 100;
      return userLevel >= requiredLevel;
    });

    if (!hasPermission) {
      this.logger.warn(`Acesso negado para ${user.email} - Role: ${user.role}`);
      throw new ForbiddenException('Permissão insuficiente');
    }

    return true;
  }
}