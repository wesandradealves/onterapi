import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { RolesEnum } from '../../../domain/auth/enums/roles.enum';
import { AuthErrorFactory, AuthErrorType } from '../../../shared/factories/auth-error.factory';
import { MESSAGES } from '../../../shared/constants/messages.constants';
import { BaseGuard } from '../../../shared/guards/base.guard';

@Injectable()
export class UserOwnerGuard extends BaseGuard {
  private readonly logger = new Logger(UserOwnerGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const user = this.getUser(context);
    const request = context.switchToHttp().getRequest();
    const targetUserId = request.params.id as string | undefined;
    const targetSlug = request.params.slug as string | undefined;

    const adminRoles = [RolesEnum.SUPER_ADMIN, RolesEnum.ADMIN_SUPORTE, RolesEnum.ADMIN_FINANCEIRO];

    if (adminRoles.includes(user.role as RolesEnum)) {
      const target = targetSlug ?? targetUserId ?? 'desconhecido';
      this.logger.log(`${MESSAGES.GUARDS.ADMIN_ACCESS} ${target}`);
      return true;
    }

    if (targetUserId && user.id === targetUserId) {
      this.logger.log(MESSAGES.GUARDS.ACCESSING_OWN_DATA);
      return true;
    }

    const metadata = (user.metadata || {}) as Record<string, unknown>;
    const rawSlug = metadata['slug'];
    const currentSlug = typeof rawSlug === 'string' ? rawSlug : undefined;

    if (targetSlug && currentSlug && currentSlug === targetSlug) {
      this.logger.log(MESSAGES.GUARDS.ACCESSING_OWN_DATA);
      return true;
    }

    const attemptedTarget = targetSlug ?? targetUserId ?? 'desconhecido';
    this.logger.warn(`${MESSAGES.GUARDS.ACCESS_DENIED}: ${user.email} tentou acessar ${attemptedTarget}`);

    throw AuthErrorFactory.create(AuthErrorType.ACCESS_DENIED, {
      reason: MESSAGES.GUARDS.ACCESS_DENIED_OWN_DATA,
    });
  }
}
