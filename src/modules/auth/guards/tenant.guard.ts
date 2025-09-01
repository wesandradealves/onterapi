import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesEnum, INTERNAL_ROLES } from '../../../domain/auth/enums/roles.enum';

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    // Usuários internos têm acesso a todos os tenants
    if (INTERNAL_ROLES.includes(user.role)) {
      return true;
    }

    // Verificar se a requisição tem tenantId
    const requestTenantId = this.extractTenantId(request);
    
    if (!requestTenantId) {
      // Se não há tenantId na requisição, permitir acesso
      return true;
    }

    // Verificar se o usuário pertence ao tenant
    if (user.tenantId !== requestTenantId) {
      this.logger.warn(`Acesso negado ao tenant ${requestTenantId} para usuário ${user.email}`);
      throw new ForbiddenException('Acesso negado a este tenant');
    }

    return true;
  }

  private extractTenantId(request: any): string | null {
    // Procurar tenantId em diferentes lugares
    return (
      request.params?.tenantId ||
      request.query?.tenantId ||
      request.body?.tenantId ||
      request.headers['x-tenant-id'] ||
      null
    );
  }
}