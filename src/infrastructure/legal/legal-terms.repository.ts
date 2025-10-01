import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';

import {
  CreateLegalTermInput,
  LegalTerm,
  ListLegalTermsFilter,
  PublishLegalTermInput,
  RetireLegalTermInput,
} from '../../domain/legal/types/legal-term.types';
import { ILegalTermsRepository } from '../../domain/legal/interfaces/legal-terms.repository.interface';
import { LegalTermEntity } from './entities/legal-term.entity';

@Injectable()
export class LegalTermsRepository implements ILegalTermsRepository {
  private readonly repository: Repository<LegalTermEntity>;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    this.repository = dataSource.getRepository(LegalTermEntity);
  }

  async findActiveByContext(context: string, tenantId?: string): Promise<LegalTerm | null> {
    const query = this.repository
      .createQueryBuilder('term')
      .where('term.context = :context', { context })
      .andWhere('term.isActive = true');

    this.applyTenantFilter(query, tenantId, true, true);

    query.addOrderBy('term.publishedAt', 'DESC', 'NULLS LAST');
    query.addOrderBy('term.createdAt', 'DESC');

    const entity = await query.getOne();

    return entity ? this.mapEntityToDomain(entity) : null;
  }

  async findById(id: string): Promise<LegalTerm | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.mapEntityToDomain(entity) : null;
  }

  async findMany(filters: ListLegalTermsFilter): Promise<LegalTerm[]> {
    const query = this.repository.createQueryBuilder('term');

    if (filters.context) {
      query.andWhere('term.context = :context', { context: filters.context });
    }

    this.applyTenantFilter(query, filters.tenantId, filters.status === 'active');

    if (filters.status === 'active') {
      query.andWhere('term.isActive = true');
    } else if (filters.status === 'draft') {
      query.andWhere('term.isActive = false');
    }

    query.addOrderBy('term.isActive', 'DESC');
    query.addOrderBy('term.publishedAt', 'DESC', 'NULLS LAST');
    query.addOrderBy('term.createdAt', 'DESC');

    const entities = await query.getMany();
    return entities.map((entity) => this.mapEntityToDomain(entity));
  }

  async create(input: CreateLegalTermInput): Promise<LegalTerm> {
    const entity = this.repository.create({
      tenantId: input.tenantId ?? null,
      context: input.context,
      version: input.version,
      content: input.content,
      isActive: false,
      publishedAt: null,
    });

    const saved = await this.repository.save(entity);
    return this.mapEntityToDomain(saved);
  }

  async publish(input: PublishLegalTermInput): Promise<LegalTerm> {
    return this.dataSource.transaction(async (manager) => {
      const existing = await manager.findOne(LegalTermEntity, { where: { id: input.termId } });

      if (!existing) {
        throw new Error('LEGAL_TERM_NOT_FOUND');
      }

      if (existing.isActive) {
        return this.mapEntityToDomain(existing);
      }

      const updateBuilder = manager
        .createQueryBuilder()
        .update(LegalTermEntity)
        .set({ isActive: false })
        .where('context = :context', { context: existing.context });

      if (existing.tenantId) {
        updateBuilder.andWhere('tenant_id = :tenantId', { tenantId: existing.tenantId });
      } else {
        updateBuilder.andWhere('tenant_id IS NULL');
      }

      await updateBuilder.execute();

      existing.isActive = true;
      existing.publishedAt = input.publishedAt;

      const saved = await manager.save(existing);
      return this.mapEntityToDomain(saved);
    });
  }

  async retire(input: RetireLegalTermInput): Promise<LegalTerm> {
    const term = await this.repository.findOne({ where: { id: input.termId } });

    if (!term) {
      throw new Error('LEGAL_TERM_NOT_FOUND');
    }

    if (!term.isActive) {
      return this.mapEntityToDomain(term);
    }

    term.isActive = false;
    await this.repository.save(term);

    return this.mapEntityToDomain(term);
  }

  private applyTenantFilter(
    query: SelectQueryBuilder<LegalTermEntity>,
    tenantId: string | null | undefined,
    prioritizeTenant: boolean,
    requireGlobalWhenNoTenant = false,
  ): void {
    if (tenantId) {
      query.andWhere('(term.tenantId = :tenantId OR term.tenantId IS NULL)', { tenantId });
      if (prioritizeTenant) {
        query.addOrderBy('CASE WHEN term.tenantId = :tenantId THEN 0 ELSE 1 END', 'ASC');
      }
      return;
    }

    if (requireGlobalWhenNoTenant) {
      query.andWhere('term.tenantId IS NULL');
    }
  }

  private mapEntityToDomain(entity: LegalTermEntity): LegalTerm {
    return {
      id: entity.id,
      tenantId: entity.tenantId ?? null,
      context: entity.context,
      version: entity.version,
      content: entity.content,
      isActive: entity.isActive,
      publishedAt: entity.publishedAt ?? null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
