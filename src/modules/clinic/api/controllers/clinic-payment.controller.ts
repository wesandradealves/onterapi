import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { ICurrentUser } from '../../../../domain/auth/interfaces/current-user.interface';
import { RolesEnum } from '../../../../domain/auth/enums/roles.enum';
import { ClinicScopeGuard } from '../../guards/clinic-scope.guard';
import {
  IGetClinicPaymentLedgerUseCase,
  IGetClinicPaymentLedgerUseCase as IGetClinicPaymentLedgerUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/get-clinic-payment-ledger.use-case.interface';
import {
  IListClinicPaymentLedgersUseCase,
  IListClinicPaymentLedgersUseCase as IListClinicPaymentLedgersUseCaseToken,
} from '../../../../domain/clinic/interfaces/use-cases/list-clinic-payment-ledgers.use-case.interface';
import { ClinicPresenter } from '../presenters/clinic.presenter';
import { ClinicPaymentLedgerResponseDto } from '../dtos/clinic-payment-ledger-response.dto';
import { ClinicPaymentLedgerListResponseDto } from '../dtos/clinic-payment-ledger-list-response.dto';
import {
  listClinicPaymentLedgersSchema,
  ListClinicPaymentLedgersSchema,
} from '../schemas/list-clinic-payment-ledgers.schema';
import { ZodValidationPipe } from '../../../../shared/pipes/zod-validation.pipe';

@ApiTags('Clinics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, ClinicScopeGuard)
@Controller('clinics/:clinicId/payments')
export class ClinicPaymentController {
  constructor(
    @Inject(IGetClinicPaymentLedgerUseCaseToken)
    private readonly getClinicPaymentLedgerUseCase: IGetClinicPaymentLedgerUseCase,
    @Inject(IListClinicPaymentLedgersUseCaseToken)
    private readonly listClinicPaymentLedgersUseCase: IListClinicPaymentLedgersUseCase,
  ) {}

  @Get()
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Listar ledger financeiro dos agendamentos da clinica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiResponse({ status: 200, type: ClinicPaymentLedgerListResponseDto })
  @ApiQuery({
    name: 'paymentStatus',
    required: false,
    type: String,
    description:
      'Estados de pagamento separados por virgula (approved, settled, refunded, chargeback, failed)',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    description: 'Filtro de data inicial (ISO 8601) para confirmedAt',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    description: 'Filtro de data final (ISO 8601) para confirmedAt',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Quantidade maxima de registros (ate 100)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Deslocamento para paginacao',
  })
  async listPaymentLedgers(
    @Param('clinicId') clinicId: string,
    @Query(new ZodValidationPipe(listClinicPaymentLedgersSchema))
    query: ListClinicPaymentLedgersSchema,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicPaymentLedgerListResponseDto> {
    const tenantId = tenantHeader ?? query.tenantId ?? currentUser.tenantId;

    if (!tenantId) {
      throw new BadRequestException('Tenant nao informado');
    }

    const statuses =
      query.paymentStatus?.map(
        (status) => status as ClinicPaymentLedgerResponseDto['paymentStatus'],
      ) ?? undefined;

    const items = await this.listClinicPaymentLedgersUseCase.executeOrThrow({
      clinicId,
      tenantId,
      paymentStatuses: statuses,
      fromConfirmedAt: query.from,
      toConfirmedAt: query.to,
      limit: query.limit,
      offset: query.offset,
    });

    return ClinicPresenter.paymentLedgerList(items);
  }

  @Get(':appointmentId/ledger')
  @Roles(RolesEnum.CLINIC_OWNER, RolesEnum.MANAGER, RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obter ledger financeiro de um agendamento da clinica' })
  @ApiParam({ name: 'clinicId', type: String })
  @ApiParam({ name: 'appointmentId', type: String })
  @ApiResponse({ status: 200, type: ClinicPaymentLedgerResponseDto })
  async getPaymentLedger(
    @Param('clinicId') clinicId: string,
    @Param('appointmentId') appointmentId: string,
    @CurrentUser() currentUser: ICurrentUser,
    @Headers('x-tenant-id') tenantHeader?: string,
  ): Promise<ClinicPaymentLedgerResponseDto> {
    const tenantId = tenantHeader ?? currentUser.tenantId;

    if (!tenantId) {
      throw new BadRequestException('Tenant nao informado');
    }

    const result = await this.getClinicPaymentLedgerUseCase.executeOrThrow({
      clinicId,
      appointmentId,
      tenantId,
    });

    return ClinicPresenter.paymentLedger({
      appointmentId: result.appointmentId,
      clinicId: result.clinicId,
      tenantId: result.tenantId,
      paymentStatus: result.paymentStatus,
      paymentTransactionId: result.paymentTransactionId,
      ledger: result.ledger,
    });
  }
}
