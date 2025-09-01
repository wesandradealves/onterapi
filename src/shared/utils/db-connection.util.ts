import { EntityManager } from 'typeorm';

/**
 * Gera ID único para savepoint
 * Formato: savepoint_YYYYMMDDHHMMSS_random
 */
export function generateSavepointId(): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:T.Z]/g, '')
    .slice(0, 14);
  const random = Math.random().toString(36).substring(2, 8);
  return `savepoint_${timestamp}_${random}`;
}

/**
 * Cria um savepoint na transação
 */
export async function createSavepoint(
  manager: EntityManager,
  id: string,
): Promise<void> {
  await manager.query(`SAVEPOINT ${id}`);
}

/**
 * Faz rollback para um savepoint específico
 */
export async function rollbackToSavepoint(
  manager: EntityManager,
  id: string,
): Promise<void> {
  await manager.query(`ROLLBACK TO SAVEPOINT ${id}`);
}

/**
 * Release de um savepoint (libera memória)
 */
export async function releaseSavepoint(
  manager: EntityManager,
  id: string,
): Promise<void> {
  await manager.query(`RELEASE SAVEPOINT ${id}`);
}