import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('user_sessions')
@Index(['refreshToken'], { unique: true })
@Index(['userId'])
@Index(['expiresAt'])
export class UserSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'refresh_token', type: 'varchar', length: 500, unique: true })
  refreshToken!: string;

  @Column({ name: 'access_token', type: 'varchar', length: 500, nullable: true })
  accessToken?: string;

  @Column({ name: 'device_info', type: 'jsonb', nullable: true })
  deviceInfo?: {
    userAgent?: string;
    ip?: string;
    device?: string;
    browser?: string;
    os?: string;
    fingerprint?: string;
  };

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress?: string;

  @Column({ name: 'is_trusted_device', type: 'boolean', default: false })
  isTrustedDevice!: boolean;

  @Column({ name: 'last_activity_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastActivityAt!: Date;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt!: Date;

  @Column({ name: 'revoked_at', type: 'timestamp', nullable: true })
  revokedAt?: Date;

  @Column({ name: 'revoke_reason', type: 'varchar', length: 255, nullable: true })
  revokedReason?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => UserEntity, (user) => user.sessions)
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;
}
