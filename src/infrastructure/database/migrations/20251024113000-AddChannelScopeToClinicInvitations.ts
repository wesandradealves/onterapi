import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddChannelScopeToClinicInvitations20251024113000 implements MigrationInterface {
  private readonly tableName = 'clinic_invitations';
  private readonly columnName = 'channel_scope';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn(this.tableName, this.columnName);

    if (!hasColumn) {
      await queryRunner.addColumn(
        this.tableName,
        new TableColumn({
          name: this.columnName,
          type: 'varchar',
          length: '20',
          isNullable: false,
          default: `'direct'`,
        }),
      );

      await queryRunner.query(
        `ALTER TABLE "${this.tableName}" ALTER COLUMN "${this.columnName}" DROP DEFAULT`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn(this.tableName, this.columnName);

    if (hasColumn) {
      await queryRunner.dropColumn(this.tableName, this.columnName);
    }
  }
}
