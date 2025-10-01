import { ApiProperty } from '@nestjs/swagger';

export class CreateLegalTermRequestDto {
  @ApiProperty({ example: 'therapeutic_plan' })
  context!: string;

  @ApiProperty({ example: 'v1.0' })
  version!: string;

  @ApiProperty({ example: 'Declaro estar ciente...' })
  content!: string;

  @ApiProperty({ required: false, nullable: true, example: 'a4d3c56e-...' })
  tenantId?: string;

  @ApiProperty({ required: false, default: false })
  publishNow?: boolean;
}
