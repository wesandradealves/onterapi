import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { ClinicAccessService } from '@modules/clinic/services/clinic-access.service';
import { RolesEnum } from '@domain/auth/enums/roles.enum';
import { ICurrentUser } from '@domain/auth/interfaces/current-user.interface';
import { ClinicMember } from '@domain/clinic/types/clinic.types';

const createUser = (overrides: Partial<ICurrentUser> = {}): ICurrentUser => ({
  id: 'user-1',
  role: RolesEnum.CLINIC_OWNER,
  tenantId: 'tenant-1',
  email: 'user@example.com',
  name: 'User',
  sessionId: 'session-1',
  metadata: {},
  ...overrides,
});

describe('ClinicAccessService', () => {
  const memberships: ClinicMember[] = [
    {
      id: 'membership-1',
      clinicId: 'clinic-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      role: RolesEnum.CLINIC_OWNER,
      status: 'active',
      scope: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'membership-2',
      clinicId: 'clinic-2',
      tenantId: 'tenant-1',
      userId: 'user-1',
      role: RolesEnum.MANAGER,
      status: 'active',
      scope: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  let clinicMemberRepository: {
    findActiveByClinicAndUser: jest.Mock;
    listActiveByUser: jest.Mock;
  };
  let service: ClinicAccessService;

  beforeEach(() => {
    clinicMemberRepository = {
      findActiveByClinicAndUser: jest.fn(),
      listActiveByUser: jest.fn(),
    };

    service = new ClinicAccessService(clinicMemberRepository as never);
  });

  describe('assertClinicAccess', () => {
    it('permite acesso para papeis globais', async () => {
      await expect(
        service.assertClinicAccess({
          clinicId: 'any',
          user: createUser({ role: RolesEnum.SUPER_ADMIN }),
        }),
      ).resolves.toBeUndefined();

      expect(clinicMemberRepository.findActiveByClinicAndUser).not.toHaveBeenCalled();
    });

    it('lança BadRequestException quando tenant não informado', async () => {
      await expect(
        service.assertClinicAccess({
          clinicId: 'clinic-1',
          user: createUser({ tenantId: undefined }),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('permite acesso quando usuário pertence à clínica', async () => {
      clinicMemberRepository.findActiveByClinicAndUser.mockResolvedValue(memberships[0]);

      await expect(
        service.assertClinicAccess({
          clinicId: 'clinic-1',
          tenantId: 'tenant-1',
          user: createUser(),
        }),
      ).resolves.toBeUndefined();
    });

    it('lança ForbiddenException quando usuário não pertence à clínica', async () => {
      clinicMemberRepository.findActiveByClinicAndUser.mockResolvedValue(null);

      await expect(
        service.assertClinicAccess({
          clinicId: 'clinic-1',
          tenantId: 'tenant-1',
          user: createUser(),
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('resolveAuthorizedClinicIds', () => {
    it('retorna lista vazia para papeis globais sem filtro', async () => {
      const result = await service.resolveAuthorizedClinicIds({
        tenantId: 'tenant-x',
        user: createUser({ role: RolesEnum.SUPER_ADMIN }),
      });

      expect(result).toEqual([]);
    });

    it('valida filtros para papeis globais sem consultar repositorio', async () => {
      const result = await service.resolveAuthorizedClinicIds({
        tenantId: 'tenant-x',
        user: createUser({ role: RolesEnum.ADMIN_SUPORTE }),
        requestedClinicIds: ['clinic-1', 'clinic-1', 'clinic-2'],
      });

      expect(result).toEqual(['clinic-1', 'clinic-2']);
      expect(clinicMemberRepository.listActiveByUser).not.toHaveBeenCalled();
    });

    it('retorna todas as clínicas acessíveis quando nenhuma solicitada', async () => {
      clinicMemberRepository.listActiveByUser.mockResolvedValue(memberships);

      const result = await service.resolveAuthorizedClinicIds({
        tenantId: 'tenant-1',
        user: createUser(),
      });

      expect(result).toEqual(['clinic-1', 'clinic-2']);
    });

    it('lança ForbiddenException quando usuário não possui clínicas ativas', async () => {
      clinicMemberRepository.listActiveByUser.mockResolvedValue([]);

      await expect(
        service.resolveAuthorizedClinicIds({
          tenantId: 'tenant-1',
          user: createUser(),
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('valida que todas as clínicas solicitadas são autorizadas', async () => {
      clinicMemberRepository.listActiveByUser.mockResolvedValue(memberships);

      await expect(
        service.resolveAuthorizedClinicIds({
          tenantId: 'tenant-1',
          user: createUser(),
          requestedClinicIds: ['clinic-1', 'clinic-3'],
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('retorna as clínicas solicitadas quando usuário possui acesso', async () => {
      clinicMemberRepository.listActiveByUser.mockResolvedValue(memberships);

      const result = await service.resolveAuthorizedClinicIds({
        tenantId: 'tenant-1',
        user: createUser(),
        requestedClinicIds: ['clinic-2'],
      });

      expect(result).toEqual(['clinic-2']);
    });
  });
});
