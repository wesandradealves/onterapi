import { GetClinicProfessionalPolicyUseCase } from '../../../src/modules/clinic/use-cases/get-clinic-professional-policy.use-case';
import { IClinicProfessionalPolicyRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-professional-policy.repository.interface';
import { ClinicProfessionalPolicy } from '../../../src/domain/clinic/types/clinic.types';

describe('GetClinicProfessionalPolicyUseCase', () => {
  let repository: jest.Mocked<IClinicProfessionalPolicyRepository>;
  let useCase: GetClinicProfessionalPolicyUseCase;

  const policy: ClinicProfessionalPolicy = {
    id: 'policy-1',
    clinicId: 'clinic-1',
    tenantId: 'tenant-1',
    professionalId: 'professional-1',
    channelScope: 'direct',
    economicSummary: {
      items: [
        {
          serviceTypeId: 'service-1',
          price: 200,
          currency: 'BRL',
          payoutModel: 'percentage',
          payoutValue: 55,
        },
      ],
      orderOfRemainders: ['taxes', 'gateway', 'clinic', 'professional', 'platform'],
      roundingStrategy: 'half_even',
    },
    effectiveAt: new Date('2025-10-20T10:00:00Z'),
    endedAt: undefined,
    sourceInvitationId: 'inv-1',
    acceptedBy: 'professional-1',
    createdAt: new Date('2025-10-20T09:00:00Z'),
    updatedAt: new Date('2025-10-20T09:00:00Z'),
  };

  beforeEach(() => {
    repository = {
      findActivePolicy: jest.fn(),
      replacePolicy: jest.fn(),
    } as unknown as jest.Mocked<IClinicProfessionalPolicyRepository>;

    useCase = new GetClinicProfessionalPolicyUseCase(repository);
  });

  it('retorna politica ativa quando encontrada', async () => {
    repository.findActivePolicy.mockResolvedValue(policy);

    const result = await useCase.executeOrThrow({
      clinicId: 'clinic-1',
      tenantId: 'tenant-1',
      professionalId: 'professional-1',
    });

    expect(repository.findActivePolicy).toHaveBeenCalledWith({
      clinicId: 'clinic-1',
      tenantId: 'tenant-1',
      professionalId: 'professional-1',
    });
    expect(result).toEqual(policy);
  });

  it('lan�a erro quando politica nao existe', async () => {
    repository.findActivePolicy.mockResolvedValue(null);

    await expect(
      useCase.executeOrThrow({
        clinicId: 'clinic-1',
        tenantId: 'tenant-1',
        professionalId: 'professional-1',
      }),
    ).rejects.toThrow('Politica clinica-profissional nao encontrada');
  });
});
