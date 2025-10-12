import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  AcceptClinicInvitationInput,
  ClinicInvitation,
  ClinicInvitationStatus,
  InviteClinicProfessionalInput,
  RevokeClinicInvitationInput,
} from '../../../domain/clinic/types/clinic.types';
import { IClinicInvitationRepository } from '../../../domain/clinic/interfaces/repositories/clinic-invitation.repository.interface';
import { ClinicInvitationEntity } from '../entities/clinic-invitation.entity';
import { ClinicMapper } from '../mappers/clinic.mapper';

@Injectable()
export class ClinicInvitationRepository implements IClinicInvitationRepository {
  constructor(
    @InjectRepository(ClinicInvitationEntity)
    private readonly repository: Repository<ClinicInvitationEntity>,
  ) {}

  async create(
    input: InviteClinicProfessionalInput & { tokenHash: string },
  ): Promise<ClinicInvitation> {
    const entity = this.repository.create({
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      professionalId: input.professionalId ?? null,
      targetEmail: input.email ?? null,
      issuedBy: input.issuedBy,
      status: 'pending',
      tokenHash: input.tokenHash,
      channel: input.channel,
      expiresAt: input.expiresAt,
      economicSummary: input.economicSummary,
      metadata: input.metadata ?? {},
    });

    const saved = await this.repository.save(entity);
    return ClinicMapper.toInvitation(saved);
  }

  async findById(invitationId: string): Promise<ClinicInvitation | null> {
    const entity = await this.repository.findOne({ where: { id: invitationId } });
    return entity ? ClinicMapper.toInvitation(entity) : null;
  }

  async findByTokenHash(tokenHash: string): Promise<ClinicInvitation | null> {
    const entity = await this.repository.findOne({ where: { tokenHash } });
    return entity ? ClinicMapper.toInvitation(entity) : null;
  }

  async listPending(params: {
    clinicId: string;
    tenantId: string;
    status?: ClinicInvitationStatus[];
    page?: number;
    limit?: number;
  }): Promise<{ data: ClinicInvitation[]; total: number }> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 25;
    const offset = (page - 1) * limit;

    const query = this.repository
      .createQueryBuilder('invitation')
      .where('invitation.clinic_id = :clinicId', { clinicId: params.clinicId })
      .andWhere('invitation.tenant_id = :tenantId', { tenantId: params.tenantId });

    if (params.status && params.status.length > 0) {
      query.andWhere('invitation.status IN (:...status)', { status: params.status });
    }

    const [entities, total] = await query
      .orderBy('invitation.created_at', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return {
      data: entities.map(ClinicMapper.toInvitation),
      total,
    };
  }

  async markAccepted(input: AcceptClinicInvitationInput): Promise<ClinicInvitation> {
    const entity = await this.repository.findOneOrFail({
      where: { id: input.invitationId, tenantId: input.tenantId },
    });

    entity.status = 'accepted';
    entity.acceptedAt = new Date();
    entity.acceptedBy = input.acceptedBy;
    entity.professionalId = entity.professionalId ?? input.acceptedBy;

    const saved = await this.repository.save(entity);
    return ClinicMapper.toInvitation(saved);
  }

  async markDeclined(params: {
    invitationId: string;
    tenantId: string;
    declinedBy: string;
  }): Promise<ClinicInvitation> {
    const entity = await this.repository.findOneOrFail({
      where: { id: params.invitationId, tenantId: params.tenantId },
    });

    entity.status = 'declined';
    entity.declinedAt = new Date();
    entity.declinedBy = params.declinedBy;

    const saved = await this.repository.save(entity);
    return ClinicMapper.toInvitation(saved);
  }

  async markRevoked(input: RevokeClinicInvitationInput): Promise<ClinicInvitation> {
    const entity = await this.repository.findOneOrFail({
      where: { id: input.invitationId, tenantId: input.tenantId },
    });

    entity.status = 'revoked';
    entity.revokedAt = new Date();
    entity.revokedBy = input.revokedBy;
    entity.revocationReason = input.reason ?? null;

    const saved = await this.repository.save(entity);
    return ClinicMapper.toInvitation(saved);
  }

  async expireInvitation(invitationId: string): Promise<ClinicInvitation> {
    const entity = await this.repository.findOneOrFail({ where: { id: invitationId } });

    entity.status = 'expired';
    entity.revokedAt = new Date();

    const saved = await this.repository.save(entity);
    return ClinicMapper.toInvitation(saved);
  }

  async expireInvitationsBefore(referenceDate: Date): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .update()
      .set({ status: 'expired', revokedAt: () => 'now()' })
      .where('status = :status', { status: 'pending' })
      .andWhere('expires_at < :referenceDate', { referenceDate })
      .execute();

    return result.affected ?? 0;
  }

  async hasActiveInvitation(params: {
    clinicId: string;
    tenantId: string;
    professionalId?: string;
    email?: string;
  }): Promise<boolean> {
    const query = this.repository
      .createQueryBuilder('invitation')
      .where('invitation.clinic_id = :clinicId', { clinicId: params.clinicId })
      .andWhere('invitation.tenant_id = :tenantId', { tenantId: params.tenantId })
      .andWhere('invitation.status = :status', { status: 'pending' })
      .andWhere('invitation.expires_at > now()');

    if (params.professionalId) {
      query.andWhere('invitation.professional_id = :professionalId', {
        professionalId: params.professionalId,
      });
    }

    if (params.email) {
      query.andWhere('invitation.target_email = :email', { email: params.email });
    }

    const entity = await query.getOne();
    return Boolean(entity);
  }
}
