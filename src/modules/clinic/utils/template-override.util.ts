import { createHash } from 'crypto';

export const TEMPLATE_OVERRIDE_UNSET_FLAG = '__onterapi_unset__';

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
type JsonArray = JsonValue[];
type JsonObject = { [key: string]: JsonValue };

const isPlainObject = (value: unknown): value is JsonObject =>
  value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);

const deepClone = <T>(value: T): T => {
  if (value === undefined) {
    return value;
  }

  return JSON.parse(JSON.stringify(value)) as T;
};

const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) {
    return true;
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }

    return a.every((item, index) => deepEqual(item, b[index]));
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) {
      return false;
    }

    return keysA.every((key) => keysB.includes(key) && deepEqual(a[key], b[key]));
  }

  return false;
};

const isUnsetMarker = (value: unknown): value is { [TEMPLATE_OVERRIDE_UNSET_FLAG]: true } =>
  isPlainObject(value) &&
  Object.keys(value).length === 1 &&
  value[TEMPLATE_OVERRIDE_UNSET_FLAG] === true;

export const calculateOverrideDiff = (base: unknown, target: unknown): unknown | undefined => {
  if (deepEqual(base, target)) {
    return undefined;
  }

  if (Array.isArray(base) || Array.isArray(target)) {
    if (target === undefined) {
      return { [TEMPLATE_OVERRIDE_UNSET_FLAG]: true };
    }

    return deepClone(target);
  }

  if (isPlainObject(base) || isPlainObject(target)) {
    const result: Record<string, unknown> = {};
    const keys = new Set([
      ...(isPlainObject(base) ? Object.keys(base) : []),
      ...(isPlainObject(target) ? Object.keys(target) : []),
    ]);

    keys.forEach((key) => {
      const baseValue = isPlainObject(base) ? base[key] : undefined;
      const targetValue = isPlainObject(target) ? target[key] : undefined;

      if (targetValue === undefined && baseValue !== undefined) {
        result[key] = { [TEMPLATE_OVERRIDE_UNSET_FLAG]: true };
        return;
      }

      const diff = calculateOverrideDiff(baseValue, targetValue);
      if (diff !== undefined) {
        result[key] = diff;
      }
    });

    return Object.keys(result).length > 0 ? result : undefined;
  }

  if (target === undefined) {
    return { [TEMPLATE_OVERRIDE_UNSET_FLAG]: true };
  }

  return deepClone(target);
};

const mergeObjects = (base: JsonObject, override: JsonObject): JsonObject => {
  const result = deepClone(base);

  Object.entries(override).forEach(([key, value]) => {
    if (isUnsetMarker(value)) {
      delete result[key];
      return;
    }

    const baseValue = result[key];

    if (isPlainObject(baseValue) && isPlainObject(value)) {
      result[key] = mergeObjects(baseValue, value);
      return;
    }

    result[key] = deepClone(value);
  });

  return result;
};

export const mergeTemplatePayload = (
  base: Record<string, unknown> | null | undefined,
  override: Record<string, unknown> | null | undefined,
): Record<string, unknown> => {
  if (!override || Object.keys(override).length === 0) {
    return deepClone(base ?? {});
  }

  if (!base || Object.keys(base).length === 0) {
    return deepClone(override);
  }

  return mergeObjects((base ?? {}) as JsonObject, override as JsonObject);
};

const stableStringify = (value: unknown): string => {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const entries = Object.keys(value)
    .sort()
    .map(
      (key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`,
    );

  return `{${entries.join(',')}}`;
};

export const hashOverridePayload = (payload: unknown): string => {
  const normalized = stableStringify(payload ?? {});
  return createHash('sha256').update(normalized).digest('hex');
};

export const isOverrideMarker = isUnsetMarker;
