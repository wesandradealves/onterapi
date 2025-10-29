import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import { ClinicAuditLog } from '../../../domain/clinic/types/clinic.types';

@Entity('clinic_audit_logs')
@Index(['tenantId', 'clinicId'])
@Index(['tenantId', 'event'])
export class ClinicAuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'clinic_id', type: 'uuid', nullable: true })
  clinicId!: string | null;

  @Column({ name: 'event', type: 'varchar', length: 150 })
  event!: string;

  @Column({ name: 'performed_by', type: 'uuid', nullable: true })
  performedBy!: string | null;

  @Column({ name: 'detail', type: 'jsonb', default: () => `'{}'` })
  detail!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  static toDomain(entity: ClinicAuditLogEntity): ClinicAuditLog {
    return {
      id: entity.id,
      tenantId: entity.tenantId,
      clinicId: entity.clinicId ?? undefined,
      event: entity.event,
      performedBy: entity.performedBy ?? undefined,
      detail: entity.detail ?? {},
      createdAt: entity.createdAt,
    };
  }
}
