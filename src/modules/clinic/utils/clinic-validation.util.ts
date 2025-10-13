import { timingSafeEqual } from 'crypto';

/**
 * Remove todos os caracteres não numéricos da string fornecida.
 */
export const onlyDigits = (value: string): string => value.replace(/\D+/g, '');

/**
 * Valida formato e dígito verificador de um CNPJ.
 * Fonte: Receita Federal – implementação adaptada para TypeScript.
 */
export const isValidCnpj = (value: string): boolean => {
  const digits = onlyDigits(value);

  if (digits.length !== 14) {
    return false;
  }

  if (/^(\d)\1+$/.test(digits)) {
    return false;
  }

  const calcCheckDigit = (base: string, factors: number[]): number => {
    const total = base
      .split('')
      .reduce((acc, digit, index) => acc + Number(digit) * factors[index], 0);

    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const base = digits.slice(0, 12);
  const firstCheck = calcCheckDigit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondCheck = calcCheckDigit(base + firstCheck, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return digits.endsWith(`${firstCheck}${secondCheck}`);
};

/**
 * Valida formato e dígito verificador de um CPF.
 */
export const isValidCpf = (value: string): boolean => {
  const digits = onlyDigits(value);

  if (digits.length !== 11) {
    return false;
  }

  if (/^(\d)\1+$/.test(digits)) {
    return false;
  }

  const calcCheckDigit = (base: string, factor: number): number => {
    const total = base
      .split('')
      .reduce((acc, digit, index) => acc + Number(digit) * (factor - index), 0);

    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstCheck = calcCheckDigit(digits.slice(0, 9), 10);
  const secondCheck = calcCheckDigit(digits.slice(0, 10), 11);

  return digits.endsWith(`${firstCheck}${secondCheck}`);
};

/**
 * Valida se a string representa um CEP brasileiro (8 dígitos).
 */
export const isValidCep = (value: string): boolean => /^\d{8}$/.test(onlyDigits(value));

/**
 * Valida número de telefone/whatsapp em formato E.164 simplificado.
 * Aceita de 10 a 14 dígitos após remover não numéricos.
 */
export const isValidPhone = (value: string): boolean => {
  const digits = onlyDigits(value);
  return digits.length >= 10 && digits.length <= 14;
};

/**
 * Validação básica para cores hexadecimais (#RGB ou #RRGGBB).
 */
export const isValidHexColor = (value: string): boolean =>
  /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value);

/**
 * Converte horário HH:mm para minutos absolutos.
 */
export const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return Number.NaN;
  }

  return hours * 60 + minutes;
};

/**
 * Compare duas strings em tempo constante para evitar ataque de timing.
 */
export const secureCompare = (a: string, b: string): boolean => {
  const first = Buffer.from(a);
  const second = Buffer.from(b);

  if (first.length !== second.length) {
    return false;
  }

  return timingSafeEqual(first, second);
};
