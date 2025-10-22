import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';

import {
  IClinicMemberRepository,
  IClinicMemberRepository as IClinicMemberRepositoryToken,
} from '../../../domain/clinic/interfaces/repositories/clinic-member.repository.interface';
import { ICurrentUser } from '../../../domain/auth/interfaces/current-user.interface';
import { RolesEnum } from '../../../domain/auth/enums/roles.enum';

type ResolveClinicScopeParams = {
  tenantId: string;
  user: ICurrentUser;
  requestedClinicIds?: string[] | null;
};

type AssertClinicAccessParams = {
  clinicId: string;
  tenantId?: string;
  user: ICurrentUser;
};

@Injectable()
export class ClinicAccessService {
  constructor(
    @Inject(IClinicMemberRepositoryToken)
    private readonly clinicMemberRepository: IClinicMemberRepository,
  ) {}

  async assertClinicAccess(params: AssertClinicAccessParams): Promise<void> {
    if (this.isGlobalRole(params.user.role)) {
      return;
    }

    if (!params.tenantId) {
      throw new BadRequestException('Tenant nao informado');
    }

    const membership = await this.clinicMemberRepository.findActiveByClinicAndUser({
      clinicId: params.clinicId,
      tenantId: params.tenantId,
      userId: params.user.id,
    });

    if (!membership) {
      throw new ForbiddenException('Usuario nao possui acesso a clinica informada');
    }
  }

  async resolveAuthorizedClinicIds(params: ResolveClinicScopeParams): Promise<string[]> {
    if (this.isGlobalRole(params.user.role)) {
      return params.requestedClinicIds && params.requestedClinicIds.length > 0
        ? Array.from(new Set(params.requestedClinicIds))
        : [];
    }

    const tenantId = params.tenantId ?? params.user.tenantId;

    if (!tenantId) {
      throw new BadRequestException('Tenant nao informado');
    }

    const memberships = await this.clinicMemberRepository.listActiveByUser({
      tenantId,
      userId: params.user.id,
    });

    const accessibleClinicIds = new Set(memberships.map((member) => member.clinicId));

    if (accessibleClinicIds.size === 0) {
      throw new ForbiddenException('Usuario nao possui acesso a nenhuma clinica');
    }

    if (!params.requestedClinicIds || params.requestedClinicIds.length === 0) {
      return Array.from(accessibleClinicIds);
    }

    const requested = Array.from(new Set(params.requestedClinicIds));
    const unauthorized = requested.filter((clinicId) => !accessibleClinicIds.has(clinicId));

    if (unauthorized.length > 0) {
      throw new ForbiddenException('Usuario nao possui acesso a uma ou mais clinicas solicitadas');
    }

    return requested;
  }

  private isGlobalRole(role: RolesEnum | string | undefined): boolean {
    if (!role) {
      return false;
    }

    const normalized = role as RolesEnum;

    return (
      normalized === RolesEnum.SUPER_ADMIN ||
      normalized === RolesEnum.ADMIN_FINANCEIRO ||
      normalized === RolesEnum.ADMIN_SUPORTE ||
      normalized === RolesEnum.ADMIN_EDITOR ||
      normalized === RolesEnum.MARKETPLACE_MANAGER
    );
  }
}
