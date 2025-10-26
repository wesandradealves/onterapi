import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';

import {
  AddClinicMemberInput,
  ClinicMember,
  ClinicMemberStatus,
  ClinicStaffRole,
  ManageClinicMemberInput,
  RemoveClinicMemberInput,
} from '../../../domain/clinic/types/clinic.types';
import { RolesEnum } from '../../../domain/auth/enums/roles.enum';
import { IClinicMemberRepository } from '../../../domain/clinic/interfaces/repositories/clinic-member.repository.interface';
import { ClinicMemberEntity } from '../entities/clinic-member.entity';
import { ClinicMapper } from '../mappers/clinic.mapper';

@Injectable()
export class ClinicMemberRepository implements IClinicMemberRepository {
  constructor(
    @InjectRepository(ClinicMemberEntity)
    private readonly repository: Repository<ClinicMemberEntity>,
  ) {}

  async addMember(input: AddClinicMemberInput): Promise<ClinicMember> {
    const entity = this.repository.create({
      clinicId: input.clinicId,
      tenantId: input.tenantId,
      userId: input.userId,
      role: input.role,
      status: input.status,
      scope: input.scope ?? [],
      preferences: {},
      joinedAt: input.joinedAt ?? new Date(),
    });

    const saved = await this.repository.save(entity);
    return ClinicMapper.toMember(saved);
  }

  async updateMember(input: ManageClinicMemberInput): Promise<ClinicMember> {
    const entity = await this.repository.findOneOrFail({ where: { id: input.memberId } });

    if (input.scope) {
      entity.scope = input.scope;
    }

    if (input.role) {
      entity.role = input.role;
    }

    if (input.status) {
      entity.status = input.status;
      entity.suspendedAt = input.status === 'suspended' ? new Date() : null;
    }

    const saved = await this.repository.save(entity);
    return ClinicMapper.toMember(saved);
  }

  async removeMember(input: RemoveClinicMemberInput): Promise<void> {
    const entity = await this.repository.findOneOrFail({
      where: { id: input.memberId, clinicId: input.clinicId, tenantId: input.tenantId },
    });

    entity.status = 'inactive';
    entity.endedAt = input.effectiveDate ?? new Date();

    await this.repository.save(entity);
  }

  async findById(memberId: string): Promise<ClinicMember | null> {
    const entity = await this.repository.findOne({ where: { id: memberId } });
    return entity ? ClinicMapper.toMember(entity) : null;
  }

  async findByUser(clinicId: string, userId: string): Promise<ClinicMember | null> {
    const entity = await this.repository.findOne({
      where: { clinicId, userId, endedAt: IsNull() },
    });

    return entity ? ClinicMapper.toMember(entity) : null;
  }

  async findActiveByClinicAndUser(params: {
    clinicId: string;
    tenantId: string;
    userId: string;
  }): Promise<ClinicMember | null> {
    const entity = await this.repository.findOne({
      where: {
        clinicId: params.clinicId,
        tenantId: params.tenantId,
        userId: params.userId,
        endedAt: IsNull(),
      },
    });

    return entity ? ClinicMapper.toMember(entity) : null;
  }

  async listActiveByUser(params: { tenantId: string; userId: string }): Promise<ClinicMember[]> {
    const entities = await this.repository.find({
      where: {
        tenantId: params.tenantId,
        userId: params.userId,
        status: 'active',
        endedAt: IsNull(),
      },
    });

    return entities.map((entity) => ClinicMapper.toMember(entity));
  }

  async countActiveProfessionalsByClinics(params: {
    tenantId: string;
    clinicIds: string[];
  }): Promise<Record<string, number>> {
    if (!params.clinicIds || params.clinicIds.length === 0) {
      return {};
    }

    const rows = await this.repository
      .createQueryBuilder('member')
      .select('member.clinic_id', 'clinicId')
      .addSelect('COUNT(*)', 'total')
      .where('member.tenant_id = :tenantId', { tenantId: params.tenantId })
      .andWhere('member.clinic_id IN (:...clinicIds)', { clinicIds: params.clinicIds })
      .andWhere('member.role = :role', { role: RolesEnum.PROFESSIONAL })
      .andWhere('member.status = :status', { status: 'active' })
      .andWhere('member.ended_at IS NULL')
      .groupBy('member.clinic_id')
      .getRawMany<{ clinicId: string; total: string }>();

    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.clinicId] = Number(row.total);
      return acc;
    }, {});
  }

  async transferProfessional(params: {
    tenantId: string;
    professionalId: string;
    fromClinicId: string;
    toClinicId: string;
    effectiveDate: Date;
  }): Promise<{ fromMembership: ClinicMember; toMembership: ClinicMember }> {
    return this.repository.manager.transaction(async (manager) => {
      const repo = manager.getRepository(ClinicMemberEntity);

      const activeMembership = await repo.findOne({
        where: {
          clinicId: params.fromClinicId,
          tenantId: params.tenantId,
          userId: params.professionalId,
          endedAt: IsNull(),
        },
      });

      if (!activeMembership) {
        throw new Error('Active membership not found for transfer');
      }

      activeMembership.status =
        activeMembership.status === 'suspended' ? activeMembership.status : 'inactive';
      activeMembership.endedAt = params.effectiveDate;

      await repo.save(activeMembership);

      const newMembership = repo.create({
        clinicId: params.toClinicId,
        tenantId: params.tenantId,
        userId: params.professionalId,
        role: activeMembership.role,
        status: activeMembership.status === 'suspended' ? 'suspended' : 'active',
        scope: activeMembership.scope ?? [],
        preferences: activeMembership.preferences ?? {},
        joinedAt: params.effectiveDate,
        suspendedAt: activeMembership.status === 'suspended' ? params.effectiveDate : null,
      });

      const savedNewMembership = await repo.save(newMembership);

      return {
        fromMembership: ClinicMapper.toMember(activeMembership),
        toMembership: ClinicMapper.toMember(savedNewMembership),
      };
    });
  }

  async listMembers(params: {
    clinicId: string;
    tenantId: string;
    status?: ClinicMemberStatus[];
    roles?: ClinicStaffRole[];
    page?: number;
    limit?: number;
  }): Promise<{ data: ClinicMember[]; total: number }> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 25;
    const offset = (page - 1) * limit;

    const query = this.repository
      .createQueryBuilder('member')
      .where('member.clinic_id = :clinicId', { clinicId: params.clinicId })
      .andWhere('member.tenant_id = :tenantId', { tenantId: params.tenantId });

    if (params.status && params.status.length > 0) {
      query.andWhere('member.status IN (:...status)', { status: params.status });
    }

    if (params.roles && params.roles.length > 0) {
      query.andWhere('member.role IN (:...roles)', { roles: params.roles });
    }

    const [entities, total] = await query
      .orderBy('member.created_at', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return {
      data: entities.map(ClinicMapper.toMember),
      total,
    };
  }

  async countByRole(clinicId: string): Promise<Record<ClinicStaffRole, number>> {
    const rows = await this.repository
      .createQueryBuilder('member')
      .select('member.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .where('member.clinic_id = :clinicId', { clinicId })
      .andWhere('member.ended_at IS NULL')
      .groupBy('member.role')
      .getRawMany<{ role: ClinicStaffRole; count: string }>();

    return rows.reduce<Record<ClinicStaffRole, number>>(
      (acc, row) => {
        acc[row.role] = Number(row.count);
        return acc;
      },
      {} as Record<ClinicStaffRole, number>,
    );
  }

  async hasQuotaAvailable(params: {
    clinicId: string;
    role: ClinicStaffRole;
    limit: number;
  }): Promise<boolean> {
    const activeCount = await this.repository.count({
      where: {
        clinicId: params.clinicId,
        role: params.role,
        status: In(['active', 'pending_invitation'] as ClinicMemberStatus[]),
        endedAt: IsNull(),
      },
    });

    return activeCount < params.limit;
  }
}
