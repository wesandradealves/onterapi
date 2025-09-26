export type Result<T, E = Error> = { data: T; error?: never } | { data?: never; error: E };

export function success<T>(data: T): Result<T> {
  return { data };
}

export function failure<E = Error>(error: E): Result<never, E> {
  return { error };
}

export function isSuccess<T, E>(result: Result<T, E>): result is { data: T } {
  return 'data' in result && !('error' in result);
}

export function isFailure<T, E>(result: Result<T, E>): result is { error: E } {
  return 'error' in result && result.error !== undefined;
}

export function unwrapResult<T, E extends Error = Error>(result: Result<T, E>): T {
  if (isFailure(result)) {
    throw result.error;
  }

  if ('data' in result) {
    return result.data as T;
  }

  throw new Error('Invalid result state');
}
