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

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ required: false, nullable: true })
  publishedAt!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
