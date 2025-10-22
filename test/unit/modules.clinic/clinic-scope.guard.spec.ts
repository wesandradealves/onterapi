import { ForbiddenException } from '@nestjs/common';

import { ClinicScopeGuard } from '@modules/clinic/guards/clinic-scope.guard';
import { ClinicAccessService } from '@modules/clinic/services/clinic-access.service';
import { RolesEnum } from '@domain/auth/enums/roles.enum';
import { ICurrentUser } from '@domain/auth/interfaces/current-user.interface';

describe('ClinicScopeGuard', () => {
  const createRequest = (overrides: Partial<Record<string, unknown>> = {}) => {
    const {
      params = {},
      body = {},
      query = {},
      headers = {},
      user = { id: 'user-1', role: RolesEnum.CLINIC_OWNER, tenantId: 'tenant-1' } as ICurrentUser,
    } = overrides;

    return {
      params,
      body,
      query,
      headers,
      user,
    };
  };

  const createContext = (request: Record<string, unknown>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as Parameters<ClinicScopeGuard['canActivate']>[0];

  let clinicAccessService: {
    assertClinicAccess: jest.Mock;
  };
  let guard: ClinicScopeGuard;

  beforeEach(() => {
    clinicAccessService = {
      assertClinicAccess: jest.fn().mockResolvedValue(undefined),
    };

    guard = new ClinicScopeGuard(clinicAccessService as unknown as ClinicAccessService);
  });

  it('retorna true quando nenhum clinicId é informado', async () => {
    const request = createRequest();

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(clinicAccessService.assertClinicAccess).not.toHaveBeenCalled();
  });

  it('lança ForbiddenException quando usuário não está autenticado', async () => {
    const request = createRequest();
    delete (request as { user?: ICurrentUser }).user;

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(clinicAccessService.assertClinicAccess).not.toHaveBeenCalled();
  });

  it('delegates validation to ClinicAccessService quando clinicId é informado', async () => {
    const request = createRequest({
      params: { clinicId: 'clinic-1' },
      headers: { 'x-tenant-id': 'tenant-1' },
    });

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

    expect(clinicAccessService.assertClinicAccess).toHaveBeenCalledWith({
      clinicId: 'clinic-1',
      tenantId: 'tenant-1',
      user: request.user,
    });
  });

  it('propaga erro do ClinicAccessService', async () => {
    clinicAccessService.assertClinicAccess.mockRejectedValue(new ForbiddenException('sem acesso'));

    const request = createRequest({
      params: { clinicId: 'clinic-1' },
      headers: { 'x-tenant-id': 'tenant-1' },
    });

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
