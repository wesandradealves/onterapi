import { LegalTerm } from '../../../../domain/legal/types/legal-term.types';
import { LegalTermResponseDto } from '../dtos/legal-term-response.dto';

export class LegalTermPresenter {
  static toDto(term: LegalTerm): LegalTermResponseDto {
    return {
      id: term.id,
      tenantId: term.tenantId ?? null,
      context: term.context,
      version: term.version,
      content: term.content,
      isActive: term.isActive,
      publishedAt: term.publishedAt ? term.publishedAt.toISOString() : null,
      createdAt: term.createdAt.toISOString(),
      updatedAt: term.updatedAt.toISOString(),
    };
  }

  static toDtoList(terms: LegalTerm[]): LegalTermResponseDto[] {
    return terms.map((term) => this.toDto(term));
  }
}
