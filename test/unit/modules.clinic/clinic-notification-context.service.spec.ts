import { ClinicNotificationContextService } from '../../../src/modules/clinic/services/clinic-notification-context.service';
import { IClinicMemberRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-member.repository.interface';
import { IClinicConfigurationRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-configuration.repository.interface';
import { IUserRepository } from '../../../src/domain/users/interfaces/repositories/user.repository.interface';

describe('ClinicNotificationContextService', () => {
  let service: ClinicNotificationContextService;
  let memberRepository: jest.Mocked<IClinicMemberRepository>;
  let configurationRepository: jest.Mocked<IClinicConfigurationRepository>;
  let userRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    memberRepository = {
      listMembers: jest.fn(),
    } as unknown as jest.Mocked<IClinicMemberRepository>;

    configurationRepository = {
      findLatestAppliedVersion: jest.fn(),
    } as unknown as jest.Mocked<IClinicConfigurationRepository>;

    userRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<IUserRepository>;

    service = new ClinicNotificationContextService(
      memberRepository,
      configurationRepository,
      userRepository,
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
});
