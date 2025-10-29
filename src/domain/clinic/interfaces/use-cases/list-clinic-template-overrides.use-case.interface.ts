import { Result } from '../../../../shared/types/result.type';
import {
  ClinicTemplateOverrideListResult,
  ListClinicTemplateOverridesInput,
} from '../../types/clinic.types';

export interface IListClinicTemplateOverridesUseCase {
  execute(
    input: ListClinicTemplateOverridesInput,
  ): Promise<Result<ClinicTemplateOverrideListResult>>;
  executeOrThrow(
    input: ListClinicTemplateOverridesInput,
  ): Promise<ClinicTemplateOverrideListResult>;
}

export const IListClinicTemplateOverridesUseCase = Symbol('IListClinicTemplateOverridesUseCase');
