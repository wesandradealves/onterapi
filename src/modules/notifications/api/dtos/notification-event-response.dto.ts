import { ApiProperty } from '@nestjs/swagger';

export class NotificationEventDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  eventName!: string;

  @ApiProperty()
  aggregateId!: string;

  @ApiProperty({ type: Object })
  payload!: Record<string, unknown>;

  @ApiProperty({ type: String, isArray: true })
  recipients!: string[];

  @ApiProperty({ type: String, isArray: true })
  channels!: string[];

  @ApiProperty()
  status!: string;

  @ApiProperty({ type: String })
  queuedAt!: string;

  @ApiProperty({ type: String, required: false })
  processedAt?: string;

  @ApiProperty({ type: String })
  createdAt!: string;

  @ApiProperty({ type: String })
  updatedAt!: string;
}

export class NotificationEventListResponseDto {
  @ApiProperty({ type: [NotificationEventDto] })
  data!: NotificationEventDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
