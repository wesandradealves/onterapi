import { ClinicInvitationRepository } from '../../../src/infrastructure/clinic/repositories/clinic-invitation.repository';
import { ClinicInvitationEntity } from '../../../src/infrastructure/clinic/entities/clinic-invitation.entity';
import { ClinicInvitationEconomicSummary } from '../../../src/domain/clinic/types/clinic.types';

describe('ClinicInvitationRepository', () => {
  describe('markAccepted', () => {
    it('should snapshot economic summary at acceptance', async () => {
      const economicSummary: ClinicInvitationEconomicSummary = {
        items: [
          {
            serviceTypeId: 'service-1',
            price: 150,
            currency: 'BRL',
            payoutModel: 'percentage',
            payoutValue: 40,
          },
        ],
        orderOfRemainders: ['taxes', 'gateway', 'clinic', 'professional', 'platform'],
        roundingStrategy: 'half_even',
      };

      const entity = Object.assign(new ClinicInvitationEntity(), {
        id: 'invitation-1',
        clinicId: 'clinic-1',
        tenantId: 'tenant-1',
        issuedBy: 'owner-1',
        status: 'pending',
        tokenHash: 'token-hash',
        channel: 'email',
        expiresAt: new Date('2025-12-01T12:00:00Z'),
        economicSummary,
        metadata: {},
        createdAt: new Date('2025-10-10T10:00:00Z'),
        updatedAt: new Date('2025-10-10T10:00:00Z'),
      });

      const saveMock = jest.fn().mockImplementation(async (value: ClinicInvitationEntity) => value);

      const typeOrmRepository = {
        findOneOrFail: jest.fn().mockResolvedValue(entity),
        save: saveMock,
      };

      const repository = new ClinicInvitationRepository(typeOrmRepository as any);

      const result = await repository.markAccepted({
        invitationId: 'invitation-1',
        tenantId: 'tenant-1',
        acceptedBy: 'professional-1',
        token: 'raw-token',
      });

      expect(typeOrmRepository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: 'invitation-1', tenantId: 'tenant-1' },
      });

      expect(saveMock).toHaveBeenCalledTimes(1);
      const savedEntity = saveMock.mock.calls[0][0] as ClinicInvitationEntity;

      expect(savedEntity.acceptedEconomicSnapshot).toBeDefined();
      expect(savedEntity.acceptedEconomicSnapshot).not.toBe(economicSummary);
      expect(savedEntity.acceptedEconomicSnapshot).toEqual(economicSummary);
      expect(savedEntity.status).toBe('accepted');
      expect(savedEntity.acceptedBy).toBe('professional-1');

      expect(result.acceptedEconomicSnapshot).toEqual(economicSummary);
    });
  });

  describe('updateToken', () => {
    it('should reset acceptance fields and snapshot when reissuing token', async () => {
      const economicSummary: ClinicInvitationEconomicSummary = {
        items: [
          {
            serviceTypeId: 'service-1',
            price: 200,
            currency: 'BRL',
            payoutModel: 'fixed',
            payoutValue: 80,
          },
        ],
        orderOfRemainders: ['taxes', 'gateway', 'clinic', 'professional', 'platform'],
        roundingStrategy: 'half_even',
      };

      const snapshot: ClinicInvitationEconomicSummary = {
        ...economicSummary,
        items: economicSummary.items.map((item) => ({ ...item })),
      };

      const entity = Object.assign(new ClinicInvitationEntity(), {
        id: 'invitation-1',
        clinicId: 'clinic-1',
        tenantId: 'tenant-1',
        issuedBy: 'owner-1',
        status: 'accepted',
        tokenHash: 'token-hash',
        channel: 'email',
        expiresAt: new Date('2025-12-01T12:00:00Z'),
        economicSummary,
        acceptedAt: new Date('2025-10-12T10:00:00Z'),
        acceptedBy: 'professional-1',
        acceptedEconomicSnapshot: snapshot,
        metadata: {},
        createdAt: new Date('2025-10-10T10:00:00Z'),
        updatedAt: new Date('2025-10-10T10:00:00Z'),
      });

      const saveMock = jest.fn().mockImplementation(async (value: ClinicInvitationEntity) => value);

      const typeOrmRepository = {
        findOneOrFail: jest.fn().mockResolvedValue(entity),
        save: saveMock,
      };

      const repository = new ClinicInvitationRepository(typeOrmRepository as any);

      const result = await repository.updateToken({
        invitationId: 'invitation-1',
        tenantId: 'tenant-1',
        tokenHash: 'new-hash',
        expiresAt: new Date('2026-01-01T12:00:00Z'),
        channel: 'whatsapp',
      });

      const savedEntity = saveMock.mock.calls[0][0] as ClinicInvitationEntity;

      expect(savedEntity.acceptedAt).toBeNull();
      expect(savedEntity.acceptedBy).toBeNull();
      expect(savedEntity.acceptedEconomicSnapshot).toBeNull();
      expect(savedEntity.status).toBe('pending');
      expect(savedEntity.channel).toBe('whatsapp');
      expect(savedEntity.expiresAt.toISOString()).toBe('2026-01-01T12:00:00.000Z');
      expect(savedEntity.tokenHash).toBe('new-hash');

      expect(result.acceptedAt).toBeUndefined();
      expect(result.acceptedBy).toBeUndefined();
      expect(result.acceptedEconomicSnapshot).toBeUndefined();
      expect(result.status).toBe('pending');
    });
  });
});
