import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateClinicPaymentPayoutRequests20251015140000 implements MigrationInterface {
  private readonly tableName = 'clinic_payment_payout_requests';

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
          { name: 'appointment_id', type: 'uuid', isNullable: false },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'clinic_id', type: 'uuid', isNullable: false },
          { name: 'professional_id', type: 'uuid', isNullable: false },
          { name: 'patient_id', type: 'uuid', isNullable: false },
          { name: 'hold_id', type: 'uuid', isNullable: false },
          { name: 'service_type_id', type: 'uuid', isNullable: false },
          {
            name: 'payment_transaction_id',
            type: 'varchar',
            length: '128',
            isNullable: false,
          },
          { name: 'provider', type: 'varchar', length: '64', isNullable: false },
          {
            name: 'credentials_id',
            type: 'varchar',
            length: '128',
            isNullable: false,
          },
          { name: 'sandbox_mode', type: 'boolean', default: false },
          {
            name: 'bank_account_id',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          {
            name: 'settled_at',
            type: 'timestamp with time zone',
            isNullable: false,
          },
          { name: 'base_amount_cents', type: 'integer', isNullable: false },
          { name: 'net_amount_cents', type: 'integer', isNullable: true },
          { name: 'remainder_cents', type: 'integer', default: 0 },
          { name: 'split', type: 'jsonb', isNullable: false },
          { name: 'currency', type: 'varchar', length: '3', isNullable: false },
          {
            name: 'gateway_status',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'event_type',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          {
            name: 'fingerprint',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          {
            name: 'payload_id',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          { name: 'sandbox', type: 'boolean', default: false },
          {
            name: 'provider_payout_id',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          {
            name: 'provider_status',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'provider_payload',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'executed_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          { name: 'status', type: 'varchar', length: '20', default: `'pending'` },
          { name: 'attempts', type: 'integer', default: 0 },
          { name: 'last_error', type: 'text', isNullable: true },
          {
            name: 'requested_at',
            type: 'timestamp with time zone',
            isNullable: false,
          },
          {
            name: 'last_attempted_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'processed_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      this.tableName,
      new TableIndex({
        name: 'IDX_clinic_payment_payout_requests_transaction',
        columnNames: ['clinic_id', 'tenant_id', 'payment_transaction_id'],
      }),
    );

    await queryRunner.createIndex(
      this.tableName,
      new TableIndex({
        name: 'IDX_clinic_payment_payout_requests_fingerprint',
        columnNames: ['tenant_id', 'clinic_id', 'fingerprint'],
        isUnique: true,
        where: 'fingerprint IS NOT NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(this.tableName, 'IDX_clinic_payment_payout_requests_fingerprint');
    await queryRunner.dropIndex(this.tableName, 'IDX_clinic_payment_payout_requests_transaction');
    await queryRunner.dropTable(this.tableName);
  }
}
