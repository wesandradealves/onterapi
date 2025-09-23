import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { INTERNAL_ROLES, RolesEnum } from '../../../domain/auth/enums/roles.enum';
import { AuthErrorFactory, AuthErrorType } from '../../../shared/factories/auth-error.factory';
import { MESSAGES } from '../../../shared/constants/messages.constants';
import { BaseGuard } from '../../../shared/guards/base.guard';

@Injectable()
export class TenantGuard extends BaseGuard {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean {
    const user = this.getUser(context);
    const request = context.switchToHttp().getRequest();

    if (INTERNAL_ROLES.includes(user.role as RolesEnum)) {
      return true;
    }

    const requestTenantId = this.extractTenantId(request);

    if (!requestTenantId) {
      return true;
    }

    if (user.tenantId !== requestTenantId) {
      this.logger.warn(
        `${MESSAGES.GUARDS.ACCESS_DENIED_TENANT} ${requestTenantId} para usuário ${user.email}`,
      );
      throw AuthErrorFactory.create(AuthErrorType.TENANT_ACCESS_DENIED);
    }

    return true;
  }

  private extractTenantId(request: any): string | null {
    return (
      request.params?.tenantId ||
      request.query?.tenantId ||
      request.body?.tenantId ||
      request.headers['x-tenant-id'] ||
      null
    );
  }
}
