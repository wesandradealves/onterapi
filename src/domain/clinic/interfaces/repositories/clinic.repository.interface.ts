import {
  Clinic,
  ClinicComplianceDocumentStatus,
  ClinicConfigurationSection,
  ClinicConfigurationTelemetry,
  ClinicGeneralSettings,
  ClinicSecurityComplianceDocument,
  ClinicStatus,
  CreateClinicInput,
  UpdateClinicHoldSettingsInput,
} from '../../types/clinic.types';

export interface IClinicRepository {
  create(data: CreateClinicInput): Promise<Clinic>;
  findById(clinicId: string): Promise<Clinic | null>;
  findByTenant(tenantId: string, clinicId: string): Promise<Clinic | null>;
  findBySlug(tenantId: string, slug: string): Promise<Clinic | null>;
  findByIds(params: {
    tenantId: string;
    clinicIds: string[];
    includeDeleted?: boolean;
  }): Promise<Clinic[]>;
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
  updateConfigurationTelemetry(params: {
    clinicId: string;
    tenantId: string;
    section: ClinicConfigurationSection;
    telemetry: ClinicConfigurationTelemetry;
  }): Promise<void>;
  updateGeneralProfile(params: {
    clinicId: string;
    tenantId: string;
    requestedBy: string;
    settings: ClinicGeneralSettings;
  }): Promise<Clinic>;
  updateTemplatePropagationMetadata(params: {
    clinicId: string;
    tenantId: string;
    section: ClinicConfigurationSection;
    templateClinicId: string;
    templateVersionId: string;
    templateVersionNumber: number;
    propagatedVersionId: string;
    propagatedAt: Date;
    triggeredBy: string;
  }): Promise<void>;
  updateTemplateOverrideMetadata(params: {
    clinicId: string;
    tenantId: string;
    section: ClinicConfigurationSection;
    override?: {
      overrideId: string;
      overrideVersion: number;
      overrideHash: string;
      updatedAt: Date;
      updatedBy: string;
      appliedConfigurationVersionId?: string | null;
    } | null;
  }): Promise<void>;
  updateComplianceDocuments(params: {
    clinicId: string;
    tenantId: string;
    documents: ClinicSecurityComplianceDocument[];
    updatedBy: string;
  }): Promise<void>;
  existsByDocument(
    tenantId: string,
    documentValue: string,
    excludeClinicId?: string,
  ): Promise<boolean>;
  listComplianceDocuments(params: {
    tenantId: string;
    clinicIds: string[];
  }): Promise<Record<string, ClinicComplianceDocumentStatus[]>>;
  listTenantIds(): Promise<string[]>;
}

export const IClinicRepository = Symbol('IClinicRepository');
