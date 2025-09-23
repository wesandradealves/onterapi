import { randomUUID } from 'crypto';

const DEFAULT_MAX_LENGTH = 160;

export interface SlugOptions {
  maxLength?: number;
}

const removeAccents = (value: string): string =>
  value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');

const sanitize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

export const slugify = (value: string, options?: SlugOptions): string => {
  const maxLength = options?.maxLength ?? DEFAULT_MAX_LENGTH;
  const fallback = randomUUID().split('-')[0];
  if (!value?.trim()) {
    return fallback.slice(0, Math.min(fallback.length, maxLength));
  }

  const normalized = removeAccents(value.trim());
  let slug = sanitize(normalized).slice(0, maxLength).replace(/-+$/g, '');

  if (!slug) {
    slug = fallback;
  }

  return slug;
};

export const appendSlugSuffix = (
  baseSlug: string,
  suffix: number,
  options?: SlugOptions,
): string => {
  const maxLength = options?.maxLength ?? DEFAULT_MAX_LENGTH;
  const suffixToken = `-${suffix}`;
  const availableLength = Math.max(1, maxLength - suffixToken.length);

  const trimmedBase = baseSlug.slice(0, availableLength).replace(/-+$/g, '');
  const normalizedBase = trimmedBase || slugify('item', { maxLength: availableLength });

  return `${normalizedBase}${suffixToken}`;
};
