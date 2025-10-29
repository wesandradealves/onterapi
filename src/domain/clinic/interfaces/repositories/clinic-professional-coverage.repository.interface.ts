import {
  CancelClinicProfessionalCoverageInput,
  ClinicProfessionalCoverage,
  ClinicProfessionalCoverageClinicSummary,
  ClinicProfessionalCoverageStatus,
  CreateClinicProfessionalCoverageInput,
  ListClinicProfessionalCoveragesQuery,
} from '../../types/clinic.types';

export interface IClinicProfessionalCoverageRepository {
  create(input: CreateClinicProfessionalCoverageInput): Promise<ClinicProfessionalCoverage>;
  cancel(input: CancelClinicProfessionalCoverageInput): Promise<ClinicProfessionalCoverage | null>;
  findById(params: {
    tenantId: string;
    clinicId: string;
    coverageId: string;
  }): Promise<ClinicProfessionalCoverage | null>;
  findActiveOverlapping(params: {
    tenantId: string;
    clinicId: string;
    professionalId: string;
    coverageProfessionalId?: string;
    startAt: Date;
    endAt: Date;
    excludeCoverageId?: string;
  }): Promise<ClinicProfessionalCoverage[]>;
  findScheduledToActivate(params: {
    reference: Date;
    limit?: number;
  }): Promise<ClinicProfessionalCoverage[]>;
  findDueToComplete(params: {
    reference: Date;
    limit?: number;
  }): Promise<ClinicProfessionalCoverage[]>;
  list(params: ListClinicProfessionalCoveragesQuery): Promise<{
    data: ClinicProfessionalCoverage[];
    total: number;
    page: number;
    limit: number;
  }>;
  updateStatus(params: {
    tenantId: string;
    clinicId: string;
    coverageId: string;
    status: ClinicProfessionalCoverageStatus;
    updatedBy: string;
  }): Promise<void>;
  getClinicCoverageSummaries(params: {
    tenantId: string;
    clinicIds: string[];
    reference?: Date;
    completedWindowDays?: number;
  }): Promise<ClinicProfessionalCoverageClinicSummary[]>;
}

export const IClinicProfessionalCoverageRepository = Symbol(
  'IClinicProfessionalCoverageRepository',
);
