import { Result } from '../../../../shared/types/result.type';
import {
  ClinicConfigurationVersion,
  ClinicTemplatePropagationInput,
} from '../../types/clinic.types';

export interface IPropagateClinicTemplateUseCase {
  execute(
    input: ClinicTemplatePropagationInput,
  ): Promise<Result<ClinicConfigurationVersion[]>>;
  executeOrThrow(
    input: ClinicTemplatePropagationInput,
  ): Promise<ClinicConfigurationVersion[]>;
}

export const IPropagateClinicTemplateUseCase = Symbol('IPropagateClinicTemplateUseCase');
