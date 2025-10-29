import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { RolesEnum } from '../../../../domain/auth/enums/roles.enum';
import {
  ListNotificationEventsSchema,
  listNotificationEventsSchema,
} from '../schemas/list-notification-events.schema';
import { ZodValidationPipe } from '../../../../shared/pipes/zod-validation.pipe';
import {
  IListNotificationEventsUseCase,
  IListNotificationEventsUseCase as IListNotificationEventsUseCaseToken,
} from '../../../../domain/notifications/interfaces/use-cases/list-notification-events.use-case.interface';
import { NotificationEventPresenter } from '../presenters/notification-event.presenter';
import { NotificationEventListResponseDto } from '../dtos/notification-event-response.dto';
import { ListNotificationEventsInput } from '../../../../domain/notifications/types/notification.types';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications/events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationEventsController {
  constructor(
    @Inject(IListNotificationEventsUseCaseToken)
    private readonly listNotificationEventsUseCase: IListNotificationEventsUseCase,
  ) {}

  @Get()
  @Roles(RolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Listar eventos de notifica  es' })
  async list(
    @Query(new ZodValidationPipe(listNotificationEventsSchema))
    query: ListNotificationEventsSchema,
  ): Promise<NotificationEventListResponseDto> {
    const input = this.mapQueryToInput(query);
    const result = await this.listNotificationEventsUseCase.executeOrThrow(input);

    return NotificationEventPresenter.list(
      result.data,
      result.total,
      input.page ?? 1,
      input.limit ?? 20,
    );
  }

  private mapQueryToInput(query: ListNotificationEventsSchema): ListNotificationEventsInput {
    return {
      eventName: query.eventName,
      status: query.status,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      page: query.page,
      limit: query.limit,
    };
  }
}
