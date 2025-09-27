import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { AnamnesisEntity } from './anamnesis.entity';

@Entity('anamnesis_attachments')
@Index(['anamnesisId', 'stepNumber'])
export class AnamnesisAttachmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'anamnesis_id', type: 'uuid' })
  anamnesisId!: string;

  @Column({ name: 'step_number', type: 'smallint', nullable: true })
  stepNumber?: number;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 128 })
  mimeType!: string;

  @Column({ name: 'size', type: 'integer' })
  size!: number;

  @Column({ name: 'storage_path', type: 'varchar', length: 512 })
  storagePath!: string;

  @Column({ name: 'uploaded_by', type: 'uuid' })
  uploadedBy!: string;

  @CreateDateColumn({ name: 'uploaded_at', type: 'timestamp with time zone' })
  uploadedAt!: Date;

  @ManyToOne(() => AnamnesisEntity, (anamnesis) => anamnesis.attachments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'anamnesis_id' })
  anamnesis!: AnamnesisEntity;
}
