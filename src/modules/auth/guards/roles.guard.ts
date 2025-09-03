import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesEnum, ROLE_HIERARCHY } from '../../../domain/auth/enums/roles.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthErrorFactory, AuthErrorType } from '../../../shared/factories/auth-error.factory';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
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
      throw AuthErrorFactory.create(AuthErrorType.USER_NOT_AUTHENTICATED);
    }

    this.logger.log(`Verificando permissões para usuário: ${user.email}, Role: ${user.role}`);
    this.logger.log(`Roles requeridas: ${requiredRoles.join(', ')}`);

    const userLevel = ROLE_HIERARCHY[user.role as RolesEnum] ?? 0;
    this.logger.log(`Nível do usuário: ${userLevel}`);
    
    const hasPermission = requiredRoles.some(role => {
      const requiredLevel = ROLE_HIERARCHY[role] ?? 100;
      this.logger.log(`Verificando role ${role} (nível ${requiredLevel})`);
      return userLevel >= requiredLevel;
    });

    if (!hasPermission) {
      this.logger.warn(`Acesso negado para ${user.email} - Role: ${user.role} (nível ${userLevel})`);
      throw AuthErrorFactory.create(AuthErrorType.INSUFFICIENT_PERMISSIONS);
    }

    return true;
  }
}