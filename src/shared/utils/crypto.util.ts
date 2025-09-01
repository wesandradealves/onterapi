import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

const SALT_ROUNDS = 10;

/**
 * Gera hash de senha usando bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compara senha com hash
 */
export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Gera token aleatório seguro
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Gera código numérico para 2FA
 */
export function generateTwoFactorCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Hash SHA256 para dados sensíveis
 */
export function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Gera par de chaves para JWT (desenvolvimento)
 */
export function generateKeyPair() {
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });
}