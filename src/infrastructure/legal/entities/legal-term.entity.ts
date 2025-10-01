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
@Index(['tenantId', 'context'], { unique: true, where: '"is_active" = true' })
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

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'published_at', type: 'timestamp with time zone', nullable: true })
  publishedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
