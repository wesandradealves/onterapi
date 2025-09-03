import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { RolesEnum } from '../../../domain/auth/enums/roles.enum';
import { AuthErrorFactory, AuthErrorType } from '../../../shared/factories/auth-error.factory';

@Injectable()
export class UserOwnerGuard implements CanActivate {
  private readonly logger = new Logger(UserOwnerGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const targetUserId = request.params.id;

    if (!user) {
      throw AuthErrorFactory.create(AuthErrorType.USER_NOT_AUTHENTICATED);
    }

    const adminRoles = [
      RolesEnum.SUPER_ADMIN,
      RolesEnum.ADMIN_SUPORTE,
      RolesEnum.ADMIN_FINANCEIRO,
    ];

    if (adminRoles.includes(user.role)) {
      this.logger.log(`Admin ${user.email} acessando usuário ${targetUserId}`);
      return true;
    }

    if (user.id === targetUserId) {
      this.logger.log(`Usuário ${user.email} acessando próprios dados`);
      return true;
    }

    this.logger.warn(`Acesso negado: ${user.email} tentou acessar ${targetUserId}`);
    throw AuthErrorFactory.create(AuthErrorType.ACCESS_DENIED, { reason: 'Você só pode acessar seus próprios dados' });
  }
}