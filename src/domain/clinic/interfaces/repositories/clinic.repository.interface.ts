import {
  Clinic,
  ClinicConfigurationSection,
  ClinicStatus,
  CreateClinicInput,
  UpdateClinicHoldSettingsInput,
} from '../../types/clinic.types';

export interface IClinicRepository {
  create(data: CreateClinicInput): Promise<Clinic>;
  findById(clinicId: string): Promise<Clinic | null>;
  findByTenant(tenantId: string, clinicId: string): Promise<Clinic | null>;
  findBySlug(tenantId: string, slug: string): Promise<Clinic | null>;
  list(params: {
    tenantId: string;
    status?: ClinicStatus[];
    search?: string;
    page?: number;
    limit?: number;
    includeDeleted?: boolean;
  }): Promise<{ data: Clinic[]; total: number }>;
  updateHoldSettings(input: UpdateClinicHoldSettingsInput): Promise<Clinic>;
  updateStatus(params: {
    clinicId: string;
    tenantId: string;
    status: ClinicStatus;
    updatedBy: string;
  }): Promise<Clinic>;
  updatePrimaryOwner(params: {
    clinicId: string;
    tenantId: string;
    newOwnerId: string;
    updatedBy: string;
  }): Promise<Clinic>;
  setCurrentConfigurationVersion(params: {
    clinicId: string;
    tenantId: string;
    section: ClinicConfigurationSection;
    versionId: string;
    updatedBy: string;
  }): Promise<void>;
  existsByDocument(
    tenantId: string,
    documentValue: string,
    excludeClinicId?: string,
  ): Promise<boolean>;
}

export const IClinicRepository = Symbol('IClinicRepository');
