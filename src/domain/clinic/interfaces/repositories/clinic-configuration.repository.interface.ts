import {
  ApplyClinicConfigurationVersionInput,
  ClinicConfigurationSection,
  ClinicConfigurationVersion,
  SaveClinicConfigurationVersionInput,
} from '../../types/clinic.types';

export interface IClinicConfigurationRepository {
  findLatestAppliedVersion(
    clinicId: string,
    section: ClinicConfigurationSection,
  ): Promise<ClinicConfigurationVersion | null>;
  findVersionById(versionId: string): Promise<ClinicConfigurationVersion | null>;
  listVersions(params: {
    clinicId: string;
    section: ClinicConfigurationSection;
    limit?: number;
    beforeVersion?: number;
  }): Promise<ClinicConfigurationVersion[]>;
  createVersion(
    data: SaveClinicConfigurationVersionInput,
  ): Promise<ClinicConfigurationVersion>;
  applyVersion(input: ApplyClinicConfigurationVersionInput): Promise<void>;
  deleteVersion(params: {
    clinicId: string;
    tenantId: string;
    versionId: string;
    requestedBy: string;
  }): Promise<void>;
}

export const IClinicConfigurationRepository = Symbol('IClinicConfigurationRepository');
