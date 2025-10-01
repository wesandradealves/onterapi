import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { ILegalTermsRepository } from '../../domain/legal/interfaces/legal-terms.repository.interface';
import { LegalTerm } from '../../domain/legal/types/legal-term.types';
import { LegalTermEntity } from './entities/legal-term.entity';

@Injectable()
export class LegalTermsRepository implements ILegalTermsRepository {
  private readonly repository: Repository<LegalTermEntity>;

  constructor(
    @InjectDataSource()
    dataSource: DataSource,
  ) {
    this.repository = dataSource.getRepository(LegalTermEntity);
  }

  async findActiveByContext(context: string, tenantId?: string): Promise<LegalTerm | null> {
    const query = this.repository
      .createQueryBuilder('term')
      .where('term.context = :context', { context })
      .andWhere('term.isActive = true');

    if (tenantId) {
      query.andWhere('(term.tenantId = :tenantId OR term.tenantId IS NULL)', { tenantId });
      query.addOrderBy('CASE WHEN term.tenantId = :tenantId THEN 0 ELSE 1 END', 'ASC');
    } else {
      query.andWhere('term.tenantId IS NULL');
    }

    query.addOrderBy('term.publishedAt', 'DESC', 'NULLS LAST');
    query.addOrderBy('term.createdAt', 'DESC');

    const entity = await query.getOne();

    return entity ? this.mapEntityToDomain(entity) : null;
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
