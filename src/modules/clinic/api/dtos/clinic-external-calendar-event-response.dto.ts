import { ApiProperty } from '@nestjs/swagger';

export class ClinicExternalCalendarEventResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  professionalId!: string;

  @ApiProperty()
  externalEventId!: string;

  @ApiProperty({
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
  })
  status!: 'pending' | 'approved' | 'rejected' | 'cancelled';

  @ApiProperty({ type: String, format: 'date-time' })
  startAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  endAt!: Date;

  @ApiProperty()
  timezone!: string;

  @ApiProperty({ type: [String], nullable: true })
  validationErrors!: string[] | null;

  @ApiProperty({ nullable: true })
  calendarId!: string | null;

  @ApiProperty({ enum: ['google_calendar'] })
  source!: 'google_calendar';

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
