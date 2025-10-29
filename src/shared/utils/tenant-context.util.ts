import { BadRequestException } from '@nestjs/common';

import { RolesEnum } from '../../domain/auth/enums/roles.enum';
import { ICurrentUser } from '../../domain/auth/interfaces/current-user.interface';

export interface TenantContext {
  tenantId: string;
  userId: string;
  role: RolesEnum;
}

export interface ResolveTenantContextOptions {
  currentUser: ICurrentUser;
  tenantIdFromRequest?: string | string[] | null;
  fallbackTenantId?: string | null | undefined;
  allowMissingTenant?: boolean;
}

const normalizeCandidate = (value: string | null | undefined): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export function resolveTenantContext(
  options: ResolveTenantContextOptions,
): TenantContext {
  const { currentUser, tenantIdFromRequest, fallbackTenantId, allowMissingTenant } = options;

  const headerTenant = Array.isArray(tenantIdFromRequest)
    ? normalizeCandidate(tenantIdFromRequest.find((value) => typeof value === 'string'))
    : normalizeCandidate(tenantIdFromRequest);

  const tenantId =
    headerTenant ??
    normalizeCandidate(fallbackTenantId) ??
    normalizeCandidate(currentUser.tenantId);

  if (!tenantId) {
    if (allowMissingTenant) {
      return {
        tenantId: '',
        userId: currentUser.id,
        role: currentUser.role,
      };
    }

    throw new BadRequestException('Tenant nao informado');
  }

  return {
    tenantId,
    userId: currentUser.id,
    role: currentUser.role,
  };
}
