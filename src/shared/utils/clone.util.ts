export function clonePlain<T>(value: T): T {
  if (value === undefined || value === null) {
    return value as T;
  }

  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    if (Array.isArray(value)) {
      return [] as unknown as T;
    }

    if (typeof value === 'object') {
      return {} as T;
    }

    return value;
  }
}
