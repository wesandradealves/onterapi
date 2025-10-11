import {
  CreateLegalTermInput,
  LegalTerm,
  ListLegalTermsFilter,
  PublishLegalTermInput,
  RetireLegalTermInput,
} from '../../legal/types/legal-term.types';

export interface ILegalTermsRepository {
  findActiveByContext(context: string, tenantId?: string): Promise<LegalTerm | null>;
  findById(id: string): Promise<LegalTerm | null>;
  findMany(filters: ListLegalTermsFilter): Promise<LegalTerm[]>;
  create(input: CreateLegalTermInput): Promise<LegalTerm>;
  publish(input: PublishLegalTermInput): Promise<LegalTerm>;
  retire(input: RetireLegalTermInput): Promise<LegalTerm>;
}

export const ILegalTermsRepositoryToken = Symbol('ILegalTermsRepository');
