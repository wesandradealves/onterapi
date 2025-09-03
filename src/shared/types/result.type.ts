export type Result<T, E = Error> =
  | { data: T; error?: never }
  | { data?: never; error: E };

export function success<T>(data: T): Result<T> {
  return { data };
}

export function failure<E = Error>(error: E): Result<never, E> {
  return { error };
}

export function isSuccess<T, E>(result: Result<T, E>): result is { data: T } {
  return 'data' in result && result.data !== undefined;
}

export function isFailure<T, E>(result: Result<T, E>): result is { error: E } {
  return 'error' in result && result.error !== undefined;
}