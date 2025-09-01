/**
 * Result Pattern para tratamento de erros
 * Inspirado em Railway Oriented Programming
 */
export type Result<T, E = Error> =
  | { data: T; error?: never }
  | { data?: never; error: E };

/**
 * Helper para criar resultado de sucesso
 */
export function success<T>(data: T): Result<T> {
  return { data };
}

/**
 * Helper para criar resultado de erro
 */
export function failure<E = Error>(error: E): Result<never, E> {
  return { error };
}

/**
 * Type guard para verificar se é sucesso
 */
export function isSuccess<T, E>(result: Result<T, E>): result is { data: T } {
  return 'data' in result && result.data !== undefined;
}

/**
 * Type guard para verificar se é erro
 */
export function isFailure<T, E>(result: Result<T, E>): result is { error: E } {
  return 'error' in result && result.error !== undefined;
}