import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import {
  ClinicProfessionalPolicy,
  CreateClinicProfessionalPolicyInput,
} from '../../../domain/clinic/types/clinic.types';
import { IClinicProfessionalPolicyRepository } from '../../../domain/clinic/interfaces/repositories/clinic-professional-policy.repository.interface';
import { ClinicProfessionalPolicyEntity } from '../entities/clinic-professional-policy.entity';
import { ClinicMapper } from '../mappers/clinic.mapper';

@Injectable()
export class ClinicProfessionalPolicyRepository implements IClinicProfessionalPolicyRepository {
  constructor(
    @InjectRepository(ClinicProfessionalPolicyEntity)
    private readonly repository: Repository<ClinicProfessionalPolicyEntity>,
  ) {}

  async replacePolicy(
    input: CreateClinicProfessionalPolicyInput,
  ): Promise<ClinicProfessionalPolicy> {
    return this.repository.manager.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .update(ClinicProfessionalPolicyEntity)
        .set({ endedAt: input.effectiveAt })
        .where('clinic_id = :clinicId', { clinicId: input.clinicId })
        .andWhere('tenant_id = :tenantId', { tenantId: input.tenantId })
        .andWhere('professional_id = :professionalId', {
          professionalId: input.professionalId,
        })
        .andWhere('ended_at IS NULL')
        .execute();

      const entity = manager.create(ClinicProfessionalPolicyEntity, {
        clinicId: input.clinicId,
        tenantId: input.tenantId,
        professionalId: input.professionalId,
        channelScope: input.channelScope,
        economicSummary: input.economicSummary,
        effectiveAt: input.effectiveAt,
        sourceInvitationId: input.sourceInvitationId,
        acceptedBy: input.acceptedBy,
      });

      const saved = await manager.save(entity);
      return ClinicMapper.toProfessionalPolicy(saved);
    });
  }

  async findActivePolicy(params: {
    clinicId: string;
    tenantId: string;
    professionalId: string;
  }): Promise<ClinicProfessionalPolicy | null> {
    const entity = await this.repository.findOne({
      where: {
        clinicId: params.clinicId,
        tenantId: params.tenantId,
        professionalId: params.professionalId,
        endedAt: IsNull(),
      },
    });

    return entity ? ClinicMapper.toProfessionalPolicy(entity) : null;
  }
}
