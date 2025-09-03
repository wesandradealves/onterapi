export const VALIDATION_MESSAGES = {
  REQUIRED: 'Este campo é obrigatório',
  INVALID_EMAIL: 'Email inválido',
  INVALID_CPF: 'CPF inválido',
  INVALID_PHONE: 'Telefone inválido',
  INVALID_DATE: 'Data inválida',
  INVALID_UUID: 'ID inválido',
  MIN_LENGTH: (min: number) => `Mínimo de ${min} caracteres`,
  MAX_LENGTH: (max: number) => `Máximo de ${max} caracteres`,
  MIN_VALUE: (min: number) => `Valor mínimo: ${min}`,
  MAX_VALUE: (max: number) => `Valor máximo: ${max}`,
  PATTERN: 'Formato inválido',
  PASSWORD_WEAK: 'Senha muito fraca',
  PASSWORD_MISMATCH: 'As senhas não coincidem',
  DUPLICATE_FIELD: (field: string) => `${field} já cadastrado`,
};

export const VALIDATION_PATTERNS = {
  CPF: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
  CPF_CLEAN: /^\d{11}$/,
  PHONE: /^\(\d{2}\) \d{4,5}-\d{4}$/,
  PHONE_CLEAN: /^\d{10,11}$/,
  CEP: /^\d{5}-\d{3}$/,
  CEP_CLEAN: /^\d{8}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  DATE_ISO: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
  DATE_BR: /^\d{2}\/\d{2}\/\d{4}$/,
  TIME: /^\d{2}:\d{2}(:\d{2})?$/,
  NUMERIC: /^\d+$/,
  ALPHABETIC: /^[a-zA-Z\s]+$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
};

export const VALIDATION_LIMITS = {
  NAME_MIN: 3,
  NAME_MAX: 100,
  EMAIL_MAX: 254,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 128,
  DESCRIPTION_MAX: 500,
  NOTES_MAX: 2000,
  PHONE_MIN: 10,
  PHONE_MAX: 11,
  CPF_LENGTH: 11,
  CEP_LENGTH: 8,
};

export const PASSWORD_RULES = {
  MIN_LENGTH: 8,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SPECIAL: true,
  SPECIAL_CHARS: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};