import { EntityManager } from 'typeorm';
import { generateSecureToken } from './crypto.util';

export function generateSavepointId(): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:T.Z]/g, '')
    .slice(0, 14);
  const random = generateSecureToken(4).substring(0, 8);
  return `savepoint_${timestamp}_${random}`;
}

export async function createSavepoint(manager: EntityManager, id: string): Promise<void> {
  await manager.query(`SAVEPOINT ${id}`);
}

export async function rollbackToSavepoint(manager: EntityManager, id: string): Promise<void> {
  await manager.query(`ROLLBACK TO SAVEPOINT ${id}`);
}

export async function releaseSavepoint(manager: EntityManager, id: string): Promise<void> {
  await manager.query(`RELEASE SAVEPOINT ${id}`);
}
