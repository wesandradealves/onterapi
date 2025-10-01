import { LegalTerm } from '../../legal/types/legal-term.types';

export interface ILegalTermsRepository {
  findActiveByContext(context: string, tenantId?: string): Promise<LegalTerm | null>;
}

export const ILegalTermsRepositoryToken = Symbol('ILegalTermsRepository');
