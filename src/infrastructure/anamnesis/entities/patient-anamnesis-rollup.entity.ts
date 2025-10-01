import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('patient_anamnesis_rollups')
@Index(['tenantId', 'patientId'], { unique: true })
export class PatientAnamnesisRollupEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId!: string;

  @Column({ name: 'summary_text', type: 'text' })
  summaryText!: string;

  @Column({ name: 'summary_version', type: 'integer', default: 1 })
  summaryVersion!: number;

  @Column({ name: 'last_anamnesis_id', type: 'uuid', nullable: true })
  lastAnamnesisId?: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
