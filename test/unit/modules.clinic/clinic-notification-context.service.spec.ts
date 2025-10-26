import { ClinicNotificationContextService } from '../../../src/modules/clinic/services/clinic-notification-context.service';
import { IClinicMemberRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-member.repository.interface';
import { IClinicConfigurationRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-configuration.repository.interface';
import { IUserRepository } from '../../../src/domain/users/interfaces/repositories/user.repository.interface';
import { ClinicAuditService } from '../../../src/infrastructure/clinic/services/clinic-audit.service';

describe('ClinicNotificationContextService', () => {
  let service: ClinicNotificationContextService;
  let memberRepository: jest.Mocked<IClinicMemberRepository>;
  let configurationRepository: jest.Mocked<IClinicConfigurationRepository>;
  let userRepository: jest.Mocked<IUserRepository>;
  let auditService: jest.Mocked<ClinicAuditService>;

  beforeEach(() => {
    memberRepository = {
      listMembers: jest.fn(),
    } as unknown as jest.Mocked<IClinicMemberRepository>;

    configurationRepository = {
      findLatestAppliedVersion: jest.fn(),
    } as unknown as jest.Mocked<IClinicConfigurationRepository>;

    userRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<IUserRepository>;

    auditService = {
      register: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ClinicAuditService>;

    service = new ClinicNotificationContextService(
      memberRepository,
      configurationRepository,
      userRepository,
      auditService,
    );
  });

  describe('normalizeDispatchChannels', () => {
    it('converte system em push e remove duplicados', () => {
      const result = service.normalizeDispatchChannels([
        'system',
        'Email',
        'email',
        'whatsapp',
        'WHATSAPP',
        ' ',
        'push',
      ]);

      expect(result).toEqual(['push', 'email', 'whatsapp']);
    });

    it('retorna lista vazia para entradas invalidas', () => {
      const result = service.normalizeDispatchChannels([null as unknown as string, '', '   ']);
      expect(result).toEqual([]);
    });
  });

  describe('resolveRecipientPushTokens', () => {
    it('retorna tokens unicos para destinatarios validos', async () => {
      userRepository.findById.mockResolvedValueOnce({
        id: 'user-1',
        email: 'user@example.com',
        phone: '+5511999999999',
        isActive: true,
        metadata: {
          notification: {
            pushTokens: ['tokenA', 'tokenB', 'tokenA', '  '],
          },
        },
      } as unknown as Awaited<ReturnType<IUserRepository['findById']>>);

      const result = await service.resolveRecipientPushTokens(['user-1']);

      expect(result).toEqual([{ userId: 'user-1', tokens: ['tokenA', 'tokenB'] }]);
    });

    it('ignora destinatarios sem tokens validos', async () => {
      userRepository.findById.mockResolvedValueOnce({
        id: 'user-2',
        isActive: true,
        metadata: {},
      } as unknown as Awaited<ReturnType<IUserRepository['findById']>>);

      const result = await service.resolveRecipientPushTokens(['user-2']);

      expect(result).toEqual([]);
    });
  });

  describe('removeInvalidPushTokens', () => {
    it('remove tokens rejeitados e preserva demais configuracoes', async () => {
      userRepository.findById.mockResolvedValueOnce({
        id: 'user-1',
        isActive: true,
        metadata: {
          notification: {
            pushTokens: ['tokenA', 'tokenB', 'tokenC'],
            quietHours: { start: '22:00', end: '06:00' },
          },
        },
      } as unknown as Awaited<ReturnType<IUserRepository['findById']>>);

      userRepository.update.mockResolvedValueOnce(
        {} as Awaited<ReturnType<IUserRepository['update']>>,
      );

      await service.removeInvalidPushTokens({
        tenantId: 'tenant-1',
        clinicId: 'clinic-1',
        recipients: [{ userId: 'user-1', tokens: ['tokenA', 'tokenB'] }],
        rejectedTokens: ['tokenB', 'tokenX'],
        scope: 'test-scope',
      });

      expect(userRepository.update).toHaveBeenCalledWith('user-1', {
        metadata: {
          notification: {
            pushTokens: ['tokenA', 'tokenC'],
            quietHours: { start: '22:00', end: '06:00' },
          },
        },
      });
      expect(auditService.register).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        clinicId: 'clinic-1',
        performedBy: 'system',
        event: 'clinic.notification.push_tokens_removed',
        detail: expect.objectContaining({
          userId: 'user-1',
          removedTokens: ['tokenB'],
          remainingTokens: ['tokenA', 'tokenC'],
          scope: 'test-scope',
          removedCount: 1,
        }),
      });
    });

    it('remove secao notification quando todos tokens sao invalidados', async () => {
      userRepository.findById.mockResolvedValueOnce({
        id: 'user-2',
        isActive: true,
        metadata: {
          notification: {
            pushTokens: ['tokenA'],
          },
          preferences: { newsletter: true },
        },
      } as unknown as Awaited<ReturnType<IUserRepository['findById']>>);

      userRepository.update.mockResolvedValueOnce(
        {} as Awaited<ReturnType<IUserRepository['update']>>,
      );

      await service.removeInvalidPushTokens({
        tenantId: 'tenant-1',
        clinicId: 'clinic-1',
        recipients: [{ userId: 'user-2', tokens: ['tokenA'] }],
        rejectedTokens: ['tokenA'],
      });

      expect(userRepository.update).toHaveBeenCalledWith('user-2', {
        metadata: {
          preferences: { newsletter: true },
        },
      });
      expect(auditService.register).toHaveBeenLastCalledWith({
        tenantId: 'tenant-1',
        clinicId: 'clinic-1',
        performedBy: 'system',
        event: 'clinic.notification.push_tokens_removed',
        detail: expect.objectContaining({
          userId: 'user-2',
          removedTokens: ['tokenA'],
          remainingTokens: [],
          scope: 'clinic-notifications',
          removedCount: 1,
        }),
      });
    });
  });
});
