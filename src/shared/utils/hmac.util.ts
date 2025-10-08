import { createHmac, timingSafeEqual } from 'node:crypto';

const DEFAULT_ALGORITHM = 'sha256';
const DEFAULT_MAX_SKEW_MS = 5 * 60 * 1000; // 5 minutos

export interface BuildHmacSignatureOptions {
  secret: string;
  timestamp: string;
  body: string;
  algorithm?: string;
}

export interface VerifyHmacSignatureOptions {
  secret: string;
  timestampHeader: string;
  signatureHeader: string;
  body: unknown;
  algorithm?: string;
  maxSkewMs?: number;
  now?: number;
}

export function buildSignaturePayload(timestamp: string, body: string): string {
  return `${timestamp}.${body}`;
}

export function buildHmacSignature({
  secret,
  timestamp,
  body,
  algorithm = DEFAULT_ALGORITHM,
}: BuildHmacSignatureOptions): string {
  const payload = buildSignaturePayload(timestamp, body);
  return createHmac(algorithm, secret).update(payload).digest('hex');
}

export function formatSignature(signature: string, algorithm: string = DEFAULT_ALGORITHM): string {
  return `${algorithm}=${signature}`;
}

export function normalizeSignature(
  signatureHeader: string,
  algorithm: string = DEFAULT_ALGORITHM,
): string {
  if (!signatureHeader) {
    return '';
  }

  return signatureHeader.startsWith(`${algorithm}=`)
    ? signatureHeader.slice(algorithm.length + 1)
    : signatureHeader;
}

export function isTimestampWithinSkew(
  timestamp: number,
  now: number,
  maxSkewMs: number = DEFAULT_MAX_SKEW_MS,
): boolean {
  return Math.abs(now - timestamp) <= maxSkewMs;
}

export function stringifyBody(body: unknown): string {
  if (body === null || body === undefined) {
    return '{}';
  }

  if (typeof body === 'string') {
    return body;
  }

  try {
    return JSON.stringify(body);
  } catch {
    return '{}';
  }
}

export function verifyHmacSignature({
  secret,
  timestampHeader,
  signatureHeader,
  body,
  algorithm = DEFAULT_ALGORITHM,
  maxSkewMs = DEFAULT_MAX_SKEW_MS,
  now = Date.now(),
}: VerifyHmacSignatureOptions): { valid: boolean; reason?: string } {
  if (!secret) {
    return { valid: false, reason: 'secret-missing' };
  }

  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp)) {
    return { valid: false, reason: 'timestamp-invalid' };
  }

  if (!isTimestampWithinSkew(timestamp, now, maxSkewMs)) {
    return { valid: false, reason: 'timestamp-out-of-range' };
  }

  const normalizedSignature = normalizeSignature(signatureHeader, algorithm);
  if (!normalizedSignature) {
    return { valid: false, reason: 'signature-missing' };
  }

  const expected = buildHmacSignature({
    secret,
    timestamp: timestampHeader,
    body: stringifyBody(body),
    algorithm,
  });

  try {
    const providedBuffer = Buffer.from(normalizedSignature, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');

    if (providedBuffer.length !== expectedBuffer.length) {
      return { valid: false, reason: 'signature-length-mismatch' };
    }

    const matches = timingSafeEqual(providedBuffer, expectedBuffer);
    return matches ? { valid: true } : { valid: false, reason: 'signature-mismatch' };
  } catch (error) {
    return { valid: false, reason: 'signature-parse-error' };
  }
}
