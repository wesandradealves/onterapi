import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateClinicModuleTables1738800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'clinic_clinics',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'tenant_id', type: 'uuid' },
          { name: 'name', type: 'varchar', length: '160' },
          { name: 'slug', type: 'varchar', length: '180' },
          { name: 'status', type: 'varchar', length: '30' },
          { name: 'document_type', type: 'varchar', length: '10', isNullable: true },
          { name: 'document_value', type: 'varchar', length: '32', isNullable: true },
          { name: 'primary_owner_id', type: 'uuid' },
          {
            name: 'configuration_versions',
            type: 'jsonb',
            default: "'{}'",
          },
          { name: 'hold_settings', type: 'jsonb', isNullable: true },
          { name: 'metadata', type: 'jsonb', default: "'{}'" },
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
          {
            name: 'deleted_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'clinic_clinics',
      new TableIndex({
        name: 'uq_clinic_clinics_tenant_slug',
        columnNames: ['tenant_id', 'slug'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'clinic_clinics',
      new TableIndex({
        name: 'uq_clinic_clinics_tenant_document',
        columnNames: ['tenant_id', 'document_value'],
        isUnique: true,
        where: '"document_value" IS NOT NULL',
      }),
    );

    await queryRunner.createIndex(
      'clinic_clinics',
      new TableIndex({
        name: 'idx_clinic_clinics_tenant_status',
        columnNames: ['tenant_id', 'status'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'clinic_config_versions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'clinic_id', type: 'uuid' },
          { name: 'tenant_id', type: 'uuid' },
          { name: 'section', type: 'varchar', length: '40' },
          { name: 'version', type: 'integer' },
          { name: 'payload', type: 'jsonb' },
          { name: 'notes', type: 'text', isNullable: true },
          { name: 'created_by', type: 'uuid' },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          { name: 'applied_at', type: 'timestamp with time zone', isNullable: true },
          { name: 'auto_apply', type: 'boolean', default: false },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'clinic_config_versions',
      new TableForeignKey({
        name: 'fk_clinic_config_versions_clinic',
        columnNames: ['clinic_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'clinic_clinics',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'clinic_config_versions',
      new TableIndex({
        name: 'uq_clinic_config_versions_section',
        columnNames: ['clinic_id', 'section', 'version'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'clinic_config_versions',
      new TableIndex({
        name: 'idx_clinic_config_versions_created',
        columnNames: ['clinic_id', 'section', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'clinic_config_versions',
      new TableIndex({
        name: 'idx_clinic_config_versions_applied',
        columnNames: ['clinic_id', 'section', 'applied_at'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'clinic_members',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'clinic_id', type: 'uuid' },
          { name: 'tenant_id', type: 'uuid' },
          { name: 'user_id', type: 'uuid' },
          { name: 'role', type: 'varchar', length: '30' },
          { name: 'status', type: 'varchar', length: '30' },
          { name: 'scope', type: 'jsonb', default: "'[]'" },
          { name: 'preferences', type: 'jsonb', default: "'{}'" },
          {
            name: 'joined_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          { name: 'suspended_at', type: 'timestamp with time zone', isNullable: true },
          { name: 'ended_at', type: 'timestamp with time zone', isNullable: true },
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

    await queryRunner.createForeignKey(
      'clinic_members',
      new TableForeignKey({
        name: 'fk_clinic_members_clinic',
        columnNames: ['clinic_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'clinic_clinics',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'clinic_members',
      new TableIndex({
        name: 'idx_clinic_members_tenant_user',
        columnNames: ['tenant_id', 'user_id'],
      }),
    );

    await queryRunner.createIndex(
      'clinic_members',
      new TableIndex({
        name: 'idx_clinic_members_role',
        columnNames: ['clinic_id', 'role'],
      }),
    );

    await queryRunner.createIndex(
      'clinic_members',
      new TableIndex({
        name: 'idx_clinic_members_status',
        columnNames: ['clinic_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'clinic_members',
      new TableIndex({
        name: 'uq_clinic_members_active_user',
        columnNames: ['clinic_id', 'user_id'],
        isUnique: true,
        where: '"ended_at" IS NULL',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'clinic_invitations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'clinic_id', type: 'uuid' },
          { name: 'tenant_id', type: 'uuid' },
          { name: 'professional_id', type: 'uuid', isNullable: true },
          { name: 'target_email', type: 'varchar', length: '320', isNullable: true },
          { name: 'issued_by', type: 'uuid' },
          { name: 'status', type: 'varchar', length: '30' },
          { name: 'token_hash', type: 'varchar', length: '128' },
          { name: 'channel', type: 'varchar', length: '20' },
          { name: 'expires_at', type: 'timestamp with time zone' },
          { name: 'accepted_at', type: 'timestamp with time zone', isNullable: true },
          { name: 'accepted_by', type: 'uuid', isNullable: true },
          { name: 'declined_at', type: 'timestamp with time zone', isNullable: true },
          { name: 'declined_by', type: 'uuid', isNullable: true },
          { name: 'revoked_at', type: 'timestamp with time zone', isNullable: true },
          { name: 'revoked_by', type: 'uuid', isNullable: true },
          { name: 'revocation_reason', type: 'text', isNullable: true },
          { name: 'economic_summary', type: 'jsonb' },
          { name: 'metadata', type: 'jsonb', default: "'{}'" },
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

    await queryRunner.createForeignKey(
      'clinic_invitations',
      new TableForeignKey({
        name: 'fk_clinic_invitations_clinic',
        columnNames: ['clinic_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'clinic_clinics',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'clinic_invitations',
      new TableIndex({
        name: 'idx_clinic_invitations_status',
        columnNames: ['clinic_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'clinic_invitations',
      new TableIndex({
        name: 'idx_clinic_invitations_tenant_status',
        columnNames: ['tenant_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'clinic_invitations',
      new TableIndex({
        name: 'idx_clinic_invitations_expiry',
        columnNames: ['clinic_id', 'expires_at'],
      }),
    );

    await queryRunner.createIndex(
      'clinic_invitations',
      new TableIndex({
        name: 'uq_clinic_invitations_token_hash',
        columnNames: ['token_hash'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'clinic_service_types',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'clinic_id', type: 'uuid' },
          { name: 'tenant_id', type: 'uuid' },
          { name: 'name', type: 'varchar', length: '160' },
          { name: 'slug', type: 'varchar', length: '180' },
          { name: 'color', type: 'varchar', length: '16', isNullable: true },
          { name: 'duration_minutes', type: 'integer' },
          { name: 'price', type: 'numeric', precision: 12, scale: 2 },
          { name: 'currency', type: 'varchar', length: '3' },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'requires_anamnesis', type: 'boolean', default: false },
          { name: 'enable_online_scheduling', type: 'boolean', default: true },
          { name: 'min_advance_minutes', type: 'integer' },
          { name: 'max_advance_minutes', type: 'integer', isNullable: true },
          { name: 'cancellation_policy', type: 'jsonb' },
          { name: 'eligibility', type: 'jsonb' },
          { name: 'instructions', type: 'text', isNullable: true },
          { name: 'required_documents', type: 'jsonb', default: "'[]'" },
          { name: 'custom_fields', type: 'jsonb', default: "'[]'" },
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
          { name: 'archived_at', type: 'timestamp with time zone', isNullable: true },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'clinic_service_types',
      new TableForeignKey({
        name: 'fk_clinic_service_types_clinic',
        columnNames: ['clinic_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'clinic_clinics',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'clinic_service_types',
      new TableIndex({
        name: 'uq_clinic_service_types_slug',
        columnNames: ['clinic_id', 'slug'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'clinic_service_types',
      new TableIndex({
        name: 'idx_clinic_service_types_active',
        columnNames: ['clinic_id', 'is_active'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'clinic_alerts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'clinic_id', type: 'uuid' },
          { name: 'tenant_id', type: 'uuid' },
          { name: 'type', type: 'varchar', length: '50' },
          { name: 'channel', type: 'varchar', length: '20' },
          { name: 'triggered_by', type: 'uuid' },
          {
            name: 'triggered_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          { name: 'resolved_at', type: 'timestamp with time zone', isNullable: true },
          { name: 'resolved_by', type: 'uuid', isNullable: true },
          { name: 'payload', type: 'jsonb', default: "'{}'" },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'clinic_alerts',
      new TableForeignKey({
        name: 'fk_clinic_alerts_clinic',
        columnNames: ['clinic_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'clinic_clinics',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'clinic_alerts',
      new TableIndex({
        name: 'idx_clinic_alerts_type',
        columnNames: ['clinic_id', 'type'],
      }),
    );

    await queryRunner.createIndex(
      'clinic_alerts',
      new TableIndex({
        name: 'idx_clinic_alerts_tenant_type',
        columnNames: ['tenant_id', 'type'],
      }),
    );

    await queryRunner.createIndex(
      'clinic_alerts',
      new TableIndex({
        name: 'idx_clinic_alerts_resolved',
        columnNames: ['clinic_id', 'resolved_at'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'clinic_dashboard_metrics',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'clinic_id', type: 'uuid' },
          { name: 'tenant_id', type: 'uuid' },
          { name: 'month', type: 'varchar', length: '7' },
          { name: 'revenue', type: 'numeric', precision: 14, scale: 2, default: '0' },
          { name: 'appointments', type: 'integer', default: 0 },
          { name: 'active_patients', type: 'integer', default: 0 },
          { name: 'occupancy_rate', type: 'numeric', precision: 5, scale: 2, default: '0' },
          {
            name: 'satisfaction_score',
            type: 'numeric',
            precision: 4,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'contribution_margin',
            type: 'numeric',
            precision: 5,
            scale: 2,
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

    await queryRunner.createForeignKey(
      'clinic_dashboard_metrics',
      new TableForeignKey({
        name: 'fk_clinic_dashboard_metrics_clinic',
        columnNames: ['clinic_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'clinic_clinics',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'clinic_dashboard_metrics',
      new TableIndex({
        name: 'uq_clinic_dashboard_metrics_month',
        columnNames: ['clinic_id', 'month'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'clinic_dashboard_metrics',
      new TableIndex({
        name: 'idx_clinic_dashboard_metrics_tenant_month',
        columnNames: ['tenant_id', 'month'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'clinic_forecast_projections',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'clinic_id', type: 'uuid' },
          { name: 'tenant_id', type: 'uuid' },
          { name: 'month', type: 'varchar', length: '7' },
          {
            name: 'projected_revenue',
            type: 'numeric',
            precision: 14,
            scale: 2,
            default: '0',
          },
          { name: 'projected_appointments', type: 'integer', default: 0 },
          {
            name: 'projected_occupancy_rate',
            type: 'numeric',
            precision: 5,
            scale: 2,
            default: '0',
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

    await queryRunner.createForeignKey(
      'clinic_forecast_projections',
      new TableForeignKey({
        name: 'fk_clinic_forecast_projections_clinic',
        columnNames: ['clinic_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'clinic_clinics',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'clinic_forecast_projections',
      new TableIndex({
        name: 'uq_clinic_forecast_projections_month',
        columnNames: ['clinic_id', 'month'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'clinic_forecast_projections',
      new TableIndex({
        name: 'idx_clinic_forecast_projections_tenant_month',
        columnNames: ['tenant_id', 'month'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('clinic_forecast_projections');
    await queryRunner.dropTable('clinic_dashboard_metrics');
    await queryRunner.dropTable('clinic_alerts');
    await queryRunner.dropTable('clinic_service_types');
    await queryRunner.dropTable('clinic_invitations');
    await queryRunner.dropTable('clinic_members');
    await queryRunner.dropTable('clinic_config_versions');
    await queryRunner.dropTable('clinic_clinics');
  }
}
