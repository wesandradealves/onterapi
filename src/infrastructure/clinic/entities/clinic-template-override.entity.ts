import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ClinicConfigurationSection } from '../../../domain/clinic/types/clinic.types';
import { ClinicEntity } from './clinic.entity';

@Entity('clinic_template_overrides')
@Index(['clinicId', 'section', 'overrideVersion'], { unique: true })
@Index(['clinicId', 'section', 'supersededAt'])
export class ClinicTemplateOverrideEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'clinic_id', type: 'uuid' })
  clinicId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'template_clinic_id', type: 'uuid' })
  templateClinicId!: string;

  @Column({ name: 'section', type: 'varchar', length: 40 })
  section!: ClinicConfigurationSection;

  @Column({ name: 'override_version', type: 'integer' })
  overrideVersion!: number;

  @Column({ name: 'override_payload', type: 'jsonb' })
  overridePayload!: Record<string, unknown>;

  @Column({ name: 'override_hash', type: 'varchar', length: 128 })
  overrideHash!: string;

  @Column({ name: 'base_template_version_id', type: 'uuid' })
  baseTemplateVersionId!: string;

  @Column({ name: 'base_template_version_number', type: 'integer' })
  baseTemplateVersionNumber!: number;

  @Column({ name: 'applied_configuration_version_id', type: 'uuid', nullable: true })
  appliedConfigurationVersionId?: string | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @Column({ name: 'superseded_at', type: 'timestamp with time zone', nullable: true })
  supersededAt?: Date | null;

  @Column({ name: 'superseded_by', type: 'uuid', nullable: true })
  supersededBy?: string | null;

  @ManyToOne(() => ClinicEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinic_id' })
  clinic?: ClinicEntity;
}
