import { Body, Controller, HttpCode, HttpStatus, Inject, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Public } from '../../../auth/decorators/public.decorator';
import { ZodApiBody } from '../../../../shared/decorators/zod-api-body.decorator';
import { ZodValidationPipe } from '../../../../shared/pipes/zod-validation.pipe';
import {
  completeClinicInvitationOnboardingSchema,
  CompleteClinicInvitationOnboardingSchema,
} from '../schemas/complete-clinic-invitation-onboarding.schema';
import {
  ICompleteClinicInvitationOnboardingUseCase,
  ICompleteClinicInvitationOnboardingUseCase as ICompleteClinicInvitationOnboardingUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/complete-clinic-invitation-onboarding.use-case.interface';
import { ClinicPresenter } from '../presenters/clinic.presenter';
import { ClinicInvitationOnboardingResponseDto } from '../dtos/clinic-invitation-onboarding-response.dto';

@ApiTags('Clinics')
@Controller('clinics/invitations')
export class ClinicInvitationOnboardingController {
  constructor(
    @Inject(ICompleteClinicInvitationOnboardingUseCaseToken)
    private readonly completeOnboardingUseCase: ICompleteClinicInvitationOnboardingUseCase,
  ) {}

  @Public()
  @Post(':invitationId/onboarding')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Concluir onboarding de profissional convidado por e-mail' })
  @ApiParam({ name: 'invitationId', type: String })
  @ApiResponse({ status: 201, type: ClinicInvitationOnboardingResponseDto })
  @ZodApiBody({ schema: completeClinicInvitationOnboardingSchema })
  async completeOnboarding(
    @Param('invitationId') invitationId: string,
    @Body(new ZodValidationPipe(completeClinicInvitationOnboardingSchema))
    body: CompleteClinicInvitationOnboardingSchema,
  ): Promise<ClinicInvitationOnboardingResponseDto> {
    const result = await this.completeOnboardingUseCase.executeOrThrow({
      invitationId,
      tenantId: body.tenantId,
      token: body.token,
      name: body.name,
      cpf: body.cpf,
      phone: body.phone,
      password: body.password,
    });

    return ClinicPresenter.invitationOnboarding(result);
  }
}
