import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RolesEnum } from '../../../domain/auth/enums/roles.enum';
import { UserSessionEntity } from './user-session.entity';
import { UserPermissionEntity } from './user-permission.entity';

@Entity('users')
@Index(['email'], { unique: true })
@Index(['cpf'], { unique: true })
@Index(['supabaseId'], { unique: true })
@Index(['tenantId'])
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'supabase_id', type: 'uuid', unique: true })
  supabaseId!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true })
  password_hash?: string;

  @Column({ type: 'varchar', length: 11, unique: true })
  cpf!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string;

  @Column({
    type: 'enum',
    enum: RolesEnum,
    default: RolesEnum.PATIENT,
  })
  role!: RolesEnum;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId?: string;

  @Column({ name: 'two_factor_enabled', type: 'boolean', default: false })
  twoFactorEnabled!: boolean;

  @Column({ name: 'two_factor_secret', type: 'varchar', length: 255, nullable: true })
  twoFactorSecret?: string;

  @Column({ name: 'backup_codes', type: 'jsonb', nullable: true })
  backupCodes?: string[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'email_verified', type: 'boolean', default: false })
  emailVerified!: boolean;

  @Column({ name: 'email_verification_token', type: 'varchar', length: 255, nullable: true })
  emailVerificationToken?: string;

  @Column({ name: 'email_verification_sent_at', type: 'timestamp', nullable: true })
  emailVerificationSentAt?: Date;

  @Column({ name: 'email_verified_at', type: 'timestamp', nullable: true })
  emailVerifiedAt?: Date;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({ name: 'failed_login_attempts', type: 'int', default: 0 })
  failedLoginAttempts!: number;

  @Column({ name: 'locked_until', type: 'timestamp', nullable: true })
  lockedUntil?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;

  @OneToMany(() => UserSessionEntity, (session) => session.user)
  sessions!: UserSessionEntity[];

  @OneToMany(() => UserPermissionEntity, (permission) => permission.user)
  permissions!: UserPermissionEntity[];
}
