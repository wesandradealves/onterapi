import { Inject, Injectable } from '@nestjs/common';

import {
  ILegalTermsRepository,
  ILegalTermsRepositoryToken,
} from '../../domain/legal/interfaces/legal-terms.repository.interface';
import {
  CreateLegalTermInput,
  LegalTerm,
  ListLegalTermsFilter,
} from '../../domain/legal/types/legal-term.types';
import { LegalErrorFactory } from '../../shared/factories/legal-error.factory';

@Injectable()
export class LegalTermsService {
  constructor(
    @Inject(ILegalTermsRepositoryToken)
    private readonly legalTermsRepository: ILegalTermsRepository,
  ) {}

  async getActiveTerm(context: string, tenantId?: string): Promise<LegalTerm | null> {
    return this.legalTermsRepository.findActiveByContext(context, tenantId);
  }

  async listTerms(filters: ListLegalTermsFilter): Promise<LegalTerm[]> {
    return this.legalTermsRepository.findMany({
      status: 'all',
      ...filters,
    });
  }

  async getById(id: string): Promise<LegalTerm> {
    const term = await this.legalTermsRepository.findById(id);
    if (!term) {
      throw LegalErrorFactory.notFound();
    }
    return term;
  }

  async createTerm(input: CreateLegalTermInput): Promise<LegalTerm> {
    try {
      const draft = await this.legalTermsRepository.create({
        tenantId: input.tenantId ?? null,
        context: input.context,
        version: input.version,
        content: input.content,
        createdBy: input.createdBy,
      });

      if (input.publishNow) {
        const publishedBy = input.publishBy ?? input.createdBy;
        return this.legalTermsRepository.publish({
          termId: draft.id,
          publishedAt: new Date(),
          publishedBy,
        });
      }

      return draft;
    } catch (error) {
      if (this.isUniqueConstraintViolation(error)) {
        throw LegalErrorFactory.versionAlreadyExists();
      }
      throw error;
    }
  }

  async publishTerm(termId: string, actorId: string): Promise<LegalTerm> {
    const term = await this.legalTermsRepository.findById(termId);
    if (!term) {
      throw LegalErrorFactory.notFound();
    }

    if (term.status === 'published') {
      throw LegalErrorFactory.alreadyPublished();
    }

    return this.legalTermsRepository.publish({
      termId,
      publishedAt: new Date(),
      publishedBy: actorId,
    });
  }

  async retireTerm(termId: string, actorId: string): Promise<LegalTerm> {
    const term = await this.legalTermsRepository.findById(termId);
    if (!term) {
      throw LegalErrorFactory.notFound();
    }

    if (term.status !== 'published') {
      throw LegalErrorFactory.cannotRetireDraft();
    }

    return this.legalTermsRepository.retire({
      termId,
      retiredAt: new Date(),
      retiredBy: actorId,
    });
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const pgCode = (error as { code?: string }).code;
    const driverCode = (error as { driverError?: { code?: string } }).driverError?.code;

    return pgCode === '23505' || driverCode === '23505';
  }
}
