import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('legal_terms')
@Index(['tenantId', 'context', 'version'], { unique: true })
@Index(['tenantId', 'context'], { unique: true, where: '"status" = \'published\'' })
export class LegalTermEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId?: string | null;

  @Column({ name: 'context', type: 'varchar', length: 64 })
  context!: string;

  @Column({ name: 'version', type: 'varchar', length: 32 })
  version!: string;

  @Column({ name: 'content', type: 'text' })
  content!: string;

  @Column({ name: 'status', type: 'varchar', length: 16, default: 'draft' })
  status!: string;

  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive!: boolean;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string | null;

  @Column({ name: 'published_at', type: 'timestamp with time zone', nullable: true })
  publishedAt?: Date | null;

  @Column({ name: 'published_by', type: 'uuid', nullable: true })
  publishedBy?: string | null;

  @Column({ name: 'retired_at', type: 'timestamp with time zone', nullable: true })
  retiredAt?: Date | null;

  @Column({ name: 'retired_by', type: 'uuid', nullable: true })
  retiredBy?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
