import {
  ClinicConfigurationSection,
  ClinicTemplateOverride,
  ClinicTemplateOverrideListResult,
  CreateClinicTemplateOverrideInput,
  FindClinicTemplateOverrideParams,
  ListClinicTemplateOverridesInput,
  SupersedeClinicTemplateOverrideInput,
  UpdateClinicTemplateOverrideAppliedInput,
  UpdateClinicTemplateOverrideBaseVersionInput,
} from '../../types/clinic.types';

export interface IClinicTemplateOverrideRepository {
  findActive(params: FindClinicTemplateOverrideParams): Promise<ClinicTemplateOverride | null>;
  findLatest(params: FindClinicTemplateOverrideParams): Promise<ClinicTemplateOverride | null>;
  create(data: CreateClinicTemplateOverrideInput): Promise<ClinicTemplateOverride>;
  supersede(params: SupersedeClinicTemplateOverrideInput): Promise<void>;
  supersedeBySection(params: {
    clinicId: string;
    tenantId: string;
    section: ClinicConfigurationSection;
    supersededBy: string;
    supersededAt?: Date;
  }): Promise<void>;
  updateAppliedVersion(
    params: UpdateClinicTemplateOverrideAppliedInput,
  ): Promise<ClinicTemplateOverride | null>;
  updateBaseTemplateVersion(
    params: UpdateClinicTemplateOverrideBaseVersionInput,
  ): Promise<ClinicTemplateOverride | null>;
  list(params: ListClinicTemplateOverridesInput): Promise<ClinicTemplateOverrideListResult>;
}

export const IClinicTemplateOverrideRepository = Symbol('IClinicTemplateOverrideRepository');
