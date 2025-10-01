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
