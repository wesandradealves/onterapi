import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';

import { ClinicAccessService } from '../services/clinic-access.service';
import { ICurrentUser } from '../../../domain/auth/interfaces/current-user.interface';

@Injectable()
export class ClinicScopeGuard implements CanActivate {
  constructor(private readonly clinicAccessService: ClinicAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const currentUser = request.user as ICurrentUser | undefined;

    if (!currentUser) {
      throw new ForbiddenException('Usuario nao autenticado');
    }

    const clinicId = this.extractClinicId(request);

    if (!clinicId) {
      return true;
    }

    await this.clinicAccessService.assertClinicAccess({
      clinicId,
      tenantId: this.extractTenantId(request, currentUser),
      user: currentUser,
    });

    return true;
  }

  private extractClinicId(request: Request): string | undefined {
    const params = request.params ?? {};
    const body = request.body ?? {};
    const query = request.query ?? {};

    const candidates = [
      params.clinicId,
      params.clinic_id,
      body.clinicId,
      body.clinic_id,
      query.clinicId,
      query.clinic_id,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate.trim();
      }
    }

    return undefined;
  }

  private extractTenantId(request: Request, user: ICurrentUser): string | undefined {
    const headerTenant =
      (request.headers['x-tenant-id'] as string | string[] | undefined) ??
      (request.headers['X-Tenant-Id'] as string | string[] | undefined);

    if (Array.isArray(headerTenant)) {
      return headerTenant[0];
    }

    return headerTenant ?? user.tenantId ?? undefined;
  }
}
