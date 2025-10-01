export interface LegalTerm {
  id: string;
  tenantId?: string | null;
  context: string;
  version: string;
  content: string;
  isActive: boolean;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLegalTermInput {
  tenantId?: string | null;
  context: string;
  version: string;
  content: string;
  publishNow?: boolean;
}

export interface PublishLegalTermInput {
  termId: string;
  publishedAt: Date;
}

export interface RetireLegalTermInput {
  termId: string;
}

export type LegalTermsStatusFilter = 'active' | 'draft' | 'all';

export interface ListLegalTermsFilter {
  context?: string;
  tenantId?: string | null;
  status?: LegalTermsStatusFilter;
}
