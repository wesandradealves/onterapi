import {
  ClinicServiceTypeDefinition,
  RemoveClinicServiceTypeInput,
  UpsertClinicServiceTypeInput,
} from '../../types/clinic.types';

export interface IClinicServiceTypeRepository {
  upsert(
    input: UpsertClinicServiceTypeInput,
  ): Promise<ClinicServiceTypeDefinition>;
  remove(input: RemoveClinicServiceTypeInput): Promise<void>;
  findById(clinicId: string, serviceTypeId: string): Promise<ClinicServiceTypeDefinition | null>;
  findBySlug(
    clinicId: string,
    slug: string,
  ): Promise<ClinicServiceTypeDefinition | null>;
  list(params: {
    clinicId: string;
    tenantId: string;
    includeInactive?: boolean;
  }): Promise<ClinicServiceTypeDefinition[]>;
}

export const IClinicServiceTypeRepository = Symbol('IClinicServiceTypeRepository');
