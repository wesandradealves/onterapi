import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import {
  ClinicConfigurationSection,
  ClinicHoldSettings,
  ClinicStatus,
} from '../../../domain/clinic/types/clinic.types';

@Entity('clinic_clinics')
@Index(['tenantId', 'slug'], { unique: true })
@Index(['tenantId', 'status'])
@Index(['tenantId', 'documentValue'], {
  unique: true,
  where: '"document_value" IS NOT NULL',
})
export class ClinicEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'name', type: 'varchar', length: 160 })
  name!: string;

  @Column({ name: 'slug', type: 'varchar', length: 180 })
  slug!: string;

  @Column({ name: 'status', type: 'varchar', length: 30 })
  status!: ClinicStatus;

  @Column({ name: 'document_type', type: 'varchar', length: 10, nullable: true })
  documentType?: string | null;

  @Column({ name: 'document_value', type: 'varchar', length: 32, nullable: true })
  documentValue?: string | null;

  @Column({ name: 'primary_owner_id', type: 'uuid' })
  primaryOwnerId!: string;

  @Column({
    name: 'configuration_versions',
    type: 'jsonb',
    default: () => "'{}'",
  })
  configurationVersions!: Partial<Record<ClinicConfigurationSection, string>>;

  @Column({ name: 'hold_settings', type: 'jsonb', nullable: true })
  holdSettings?: ClinicHoldSettings | null;

  @Column({ name: 'metadata', type: 'jsonb', default: () => "'{}'" })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp with time zone', nullable: true })
  deletedAt?: Date | null;
}
