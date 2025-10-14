import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAcceptedSnapshotToClinicInvitations1739200000000
  implements MigrationInterface
{
  private readonly tableName = 'clinic_invitations';
  private readonly columnName = 'accepted_economic_snapshot';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn(this.tableName, this.columnName);

    if (!hasColumn) {
      await queryRunner.addColumn(
        this.tableName,
        new TableColumn({
          name: this.columnName,
          type: 'jsonb',
          isNullable: true,
        }),
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
