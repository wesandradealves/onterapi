import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateClinicPaymentWebhookEvents20251015113000 implements MigrationInterface {
  private readonly tableName = 'clinic_payment_webhook_events';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: this.tableName,
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tenant_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'clinic_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'provider',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'payment_transaction_id',
            type: 'varchar',
            length: '128',
            isNullable: false,
          },
          {
            name: 'fingerprint',
            type: 'varchar',
            length: '128',
            isNullable: false,
          },
          {
            name: 'appointment_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'event_type',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          {
            name: 'gateway_status',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'payload_id',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          {
            name: 'sandbox',
            type: 'boolean',
            default: false,
          },
          {
            name: 'received_at',
            type: 'timestamptz',
            isNullable: false,
          },
          {
            name: 'processed_at',
            type: 'timestamptz',
            isNullable: false,
          },
          {
            name: 'expires_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      this.tableName,
      new TableIndex({
        name: 'IDX_clinic_payment_webhook_events_fingerprint',
        columnNames: ['tenant_id', 'clinic_id', 'provider', 'fingerprint'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      this.tableName,
      new TableIndex({
        name: 'IDX_clinic_payment_webhook_events_expires_at',
        columnNames: ['expires_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(this.tableName, 'IDX_clinic_payment_webhook_events_expires_at');
    await queryRunner.dropIndex(this.tableName, 'IDX_clinic_payment_webhook_events_fingerprint');
    await queryRunner.dropTable(this.tableName);
  }
}
