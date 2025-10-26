import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateClinicProfessionalPolicies20251024120000 implements MigrationInterface {
  private readonly tableName = 'clinic_professional_policies';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable(this.tableName);

    if (!hasTable) {
      await queryRunner.createTable(
        new Table({
          name: this.tableName,
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
            { name: 'professional_id', type: 'uuid' },
            { name: 'channel_scope', type: 'varchar', length: '20' },
            { name: 'economic_summary', type: 'jsonb' },
            { name: 'effective_at', type: 'timestamp with time zone' },
            { name: 'ended_at', type: 'timestamp with time zone', isNullable: true },
            { name: 'source_invitation_id', type: 'uuid' },
            { name: 'accepted_by', type: 'uuid' },
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
        this.tableName,
        new TableForeignKey({
          name: 'fk_clinic_professional_policies_clinic',
          columnNames: ['clinic_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'clinic_clinics',
          onDelete: 'CASCADE',
        }),
      );

      await queryRunner.createIndex(
        this.tableName,
        new TableIndex({
          name: 'idx_clinic_professional_policies_lookup',
          columnNames: ['clinic_id', 'professional_id', 'tenant_id'],
        }),
      );

      await queryRunner.createIndex(
        this.tableName,
        new TableIndex({
          name: 'uq_clinic_professional_policies_active',
          columnNames: ['clinic_id', 'professional_id', 'tenant_id'],
          isUnique: true,
          where: '"ended_at" IS NULL',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable(this.tableName);

    if (hasTable) {
      await queryRunner.dropIndex(this.tableName, 'uq_clinic_professional_policies_active');
      await queryRunner.dropIndex(this.tableName, 'idx_clinic_professional_policies_lookup');
      await queryRunner.dropForeignKey(this.tableName, 'fk_clinic_professional_policies_clinic');
      await queryRunner.dropTable(this.tableName);
    }
  }
}
