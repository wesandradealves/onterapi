import { Inject, Injectable } from '@nestjs/common';

import {
  ILegalTermsRepository,
  ILegalTermsRepositoryToken,
} from '../../domain/legal/interfaces/legal-terms.repository.interface';
import { LegalTerm } from '../../domain/legal/types/legal-term.types';

@Injectable()
export class LegalTermsService {
  constructor(
    @Inject(ILegalTermsRepositoryToken)
    private readonly legalTermsRepository: ILegalTermsRepository,
  ) {}

  async getActiveTerm(context: string, tenantId?: string): Promise<LegalTerm | null> {
    return this.legalTermsRepository.findActiveByContext(context, tenantId);
  }
}
