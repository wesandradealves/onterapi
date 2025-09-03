import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesEnum, INTERNAL_ROLES } from '../../../domain/auth/enums/roles.enum';
import { AuthErrorFactory, AuthErrorType } from '../../../shared/factories/auth-error.factory';

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw AuthErrorFactory.create(AuthErrorType.USER_NOT_AUTHENTICATED);
    }

    if (INTERNAL_ROLES.includes(user.role)) {
      return true;
    }

    const requestTenantId = this.extractTenantId(request);
    
    if (!requestTenantId) {
      return true;
    }

    if (user.tenantId !== requestTenantId) {
      this.logger.warn(`Acesso negado ao tenant ${requestTenantId} para usuário ${user.email}`);
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