import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { INTERNAL_ROLES, RolesEnum } from '../../../domain/auth/enums/roles.enum';
import { AuthErrorFactory, AuthErrorType } from '../../../shared/factories/auth-error.factory';
import { MESSAGES } from '../../../shared/constants/messages.constants';
import { BaseGuard } from '../../../shared/guards/base.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

interface RequestWithTenant {
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  headers?: Record<string, unknown>;
}

@Injectable()
export class TenantGuard extends BaseGuard {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const user = this.getUser(context);
    const request = context.switchToHttp().getRequest<RequestWithTenant>();

    if (INTERNAL_ROLES.includes(user.role as RolesEnum)) {
      return true;
    }

    const requestTenantId = this.extractTenantId(request);

    if (!requestTenantId) {
      return true;
    }

    if (user.tenantId !== requestTenantId) {
      this.logger.warn(
        `${MESSAGES.GUARDS.ACCESS_DENIED_TENANT} ${requestTenantId} para usuario ${user.email}`,
      );
      throw AuthErrorFactory.create(AuthErrorType.TENANT_ACCESS_DENIED);
    }

    return true;
  }

  private extractTenantId(request: RequestWithTenant): string | null {
    const candidates = [
      this.resolveString(request.params?.tenantId),
      this.resolveString(request.query?.tenantId),
      this.resolveString(request.body?.tenantId),
      this.resolveString(request.headers?.['x-tenant-id']),
    ];

    return candidates.find((value): value is string => value !== undefined) ?? null;
  }

  private resolveString(value: unknown): string | undefined {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    if (Array.isArray(value)) {
      const [first] = value;
      return typeof first === 'string' && first.trim().length > 0 ? first.trim() : undefined;
    }
    return undefined;
  }
}
