import {
  ArchivePatientInput,
  CreatePatientInput,
  Patient,
  PatientExportRequest,
  PatientListFilters,
  PatientListItem,
  PatientSummary,
  PatientTimelineEntry,
  TransferPatientInput,
  UpdatePatientInput,
} from '../../types/patient.types';

export interface IPatientRepository {
  create(data: CreatePatientInput): Promise<Patient>;
  findById(tenantId: string, patientId: string): Promise<Patient | null>;
  findBySlug(tenantId: string, slug: string): Promise<Patient | null>;
  findSummary(tenantId: string, patientId: string): Promise<PatientSummary>;
  findTimeline(
    tenantId: string,
    patientId: string,
    options?: { limit?: number; before?: Date },
  ): Promise<PatientTimelineEntry[]>;
  findAll(params: {
    tenantId: string;
    filters?: PatientListFilters;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ data: PatientListItem[]; total: number }>;
  update(data: UpdatePatientInput): Promise<Patient>;
  transfer(data: TransferPatientInput): Promise<Patient>;
  archive(data: ArchivePatientInput): Promise<void>;
  restore(tenantId: string, patientId: string, requestedBy: string): Promise<Patient>;
  existsByCpf(tenantId: string, cpf: string, excludePatientId?: string): Promise<boolean>;
  findDuplicates(tenantId: string, cpf: string): Promise<PatientListItem[]>;
  export(request: PatientExportRequest): Promise<string>; // returns storage path or file identifier
}

export const IPatientRepositoryToken = Symbol('IPatientRepository');
