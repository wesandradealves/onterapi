import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  ClinicInvitationPolicy,
  InvitationChannel,
} from '../../../domain/scheduling/types/scheduling.types';
import {
  IClinicInvitationPolicyRepository,
  UpsertClinicInvitationPolicyInput,
} from '../../../domain/scheduling/interfaces/repositories/clinic-invitation-policy.repository.interface';
import { ClinicInvitationPolicyEntity } from '../entities/clinic-invitation-policy.entity';
import { mapClinicInvitationPolicyEntityToDomain } from '../../../shared/mappers/scheduling.mapper';

@Injectable()
export class ClinicInvitationPolicyRepository implements IClinicInvitationPolicyRepository {
  constructor(
    @InjectRepository(ClinicInvitationPolicyEntity)
    private readonly repository: Repository<ClinicInvitationPolicyEntity>,
  ) {}

  async upsert(data: UpsertClinicInvitationPolicyInput): Promise<ClinicInvitationPolicy> {
    const entity = this.repository.create({
      id: data.id,
      tenantId: data.tenantId,
      clinicId: data.clinicId,
      professionalId: data.professionalId,
      pricingMode: data.pricingMode,
      repasseMode: data.repasseMode,
      channel: data.channel,
      roundingPolicy: data.roundingPolicy,
      validFrom: data.validFrom,
      validTo: data.validTo ?? null,
      priority: data.priority,
      taxSchemaRef: data.taxSchemaRef ?? null,
    });

    const saved = await this.repository.save(entity);
    return mapClinicInvitationPolicyEntityToDomain(saved);
  }

  async findEffectivePolicy(
    tenantId: string,
    clinicId: string,
    professionalId: string,
    channel: InvitationChannel,
    atUtc: Date,
  ): Promise<ClinicInvitationPolicy | null> {
    const entity = await this.repository
      .createQueryBuilder('policy')
      .where('policy.tenant_id = :tenantId', { tenantId })
      .andWhere('policy.clinic_id = :clinicId', { clinicId })
      .andWhere('policy.professional_id = :professionalId', { professionalId })
      .andWhere('policy.channel = :channel', { channel })
      .andWhere('policy.valid_from <= :atUtc', { atUtc })
      .andWhere('(policy.valid_to IS NULL OR policy.valid_to >= :atUtc)', { atUtc })
      .orderBy('policy.priority', 'DESC')
      .addOrderBy('policy.valid_from', 'DESC')
      .getOne();

    return entity ? mapClinicInvitationPolicyEntityToDomain(entity) : null;
  }

  async listByProfessional(
    tenantId: string,
    professionalId: string,
  ): Promise<ClinicInvitationPolicy[]> {
    const entities = await this.repository.find({
      where: { tenantId, professionalId },
      order: { priority: 'DESC', validFrom: 'DESC' },
    });

    return entities.map(mapClinicInvitationPolicyEntityToDomain);
  }

  async remove(tenantId: string, policyId: string): Promise<void> {
    await this.repository.delete({ tenantId, id: policyId });
  }
}
