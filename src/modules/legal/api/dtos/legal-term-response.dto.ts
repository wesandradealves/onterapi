import { ApiProperty } from '@nestjs/swagger';

export class LegalTermResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ required: false, nullable: true })
  tenantId!: string | null;

  @ApiProperty()
  context!: string;

  @ApiProperty()
  version!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty({ enum: ['draft', 'published', 'retired'] })
  status!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ required: false, nullable: true })
  publishedAt!: string | null;

  @ApiProperty({ required: false, nullable: true })
  createdBy!: string | null;

  @ApiProperty({ required: false, nullable: true })
  publishedBy!: string | null;

  @ApiProperty({ required: false, nullable: true })
  retiredAt!: string | null;

  @ApiProperty({ required: false, nullable: true })
  retiredBy!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
