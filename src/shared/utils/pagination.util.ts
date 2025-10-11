export const clampPage = (value?: number): number => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  return 1;
};

export const clampLimit = (
  value: number | undefined,
  defaultValue = 20,
  maxValue = 200,
): number => {
  const normalized =
    typeof value === 'number' && Number.isFinite(value) && value > 0
      ? Math.floor(value)
      : defaultValue;

  return Math.min(normalized, maxValue);
};
