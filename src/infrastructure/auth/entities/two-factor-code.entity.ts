import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('two_factor_codes')
@Index(['userId', 'code'])
@Index(['expiresAt'])
export class TwoFactorCodeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 6 })
  code: string;

  @Column({ type: 'enum', enum: ['sms', 'email', 'authenticator'] })
  method: 'sms' | 'email' | 'authenticator';

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ name: 'max_attempts', type: 'int', default: 3 })
  maxAttempts: number;

  @Column({ name: 'is_used', type: 'boolean', default: false })
  isUsed: boolean;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'used_at', type: 'timestamp', nullable: true })
  usedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}