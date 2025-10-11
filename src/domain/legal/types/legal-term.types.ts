export type LegalTermStatus = 'draft' | 'published' | 'retired';

export interface LegalTerm {
  id: string;
  tenantId?: string | null;
  context: string;
  version: string;
  content: string;
  status: LegalTermStatus;
  isActive: boolean;
  createdBy?: string | null;
  publishedAt?: Date | null;
  publishedBy?: string | null;
  retiredAt?: Date | null;
  retiredBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLegalTermInput {
  tenantId?: string | null;
  context: string;
  version: string;
  content: string;
  createdBy: string;
  publishNow?: boolean;
  publishBy?: string;
}

export interface PublishLegalTermInput {
  termId: string;
  publishedAt: Date;
  publishedBy: string;
}

export interface RetireLegalTermInput {
  termId: string;
  retiredAt: Date;
  retiredBy: string;
}

export type LegalTermsStatusFilter = 'published' | 'draft' | 'retired' | 'all';

export interface ListLegalTermsFilter {
  context?: string;
  tenantId?: string | null;
  status?: LegalTermsStatusFilter;
}
