import { Result } from '../../../../shared/types/result.type';
import {
  ClinicProfessionalCoverage,
  ListClinicProfessionalCoveragesQuery,
} from '../../types/clinic.types';

export interface IListClinicProfessionalCoveragesUseCase {
  execute(query: ListClinicProfessionalCoveragesQuery): Promise<
    Result<{
      data: ClinicProfessionalCoverage[];
      total: number;
      page: number;
      limit: number;
    }>
  >;
  executeOrThrow(query: ListClinicProfessionalCoveragesQuery): Promise<{
    data: ClinicProfessionalCoverage[];
    total: number;
    page: number;
    limit: number;
  }>;
}

export const IListClinicProfessionalCoveragesUseCase = Symbol(
  'IListClinicProfessionalCoveragesUseCase',
);
