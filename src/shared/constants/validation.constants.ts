export const VALIDATION_CONSTANTS = {
  PASSWORD: {
    MIN_LENGTH: 8,
    REGEX: {
      LOWERCASE: /(?=.*[a-z])/,
      UPPERCASE: /(?=.*[A-Z])/,
      NUMBER: /(?=.*[0-9])/,
      SPECIAL: /(?=.*[!@#$%^&*])/,
    },
    MESSAGES: {
      MIN_LENGTH: 'Senha deve ter no mínimo 8 caracteres',
      LOWERCASE: 'Senha deve conter pelo menos uma letra minúscula',
      UPPERCASE: 'Senha deve conter pelo menos uma letra maiúscula',
      NUMBER: 'Senha deve conter pelo menos um número',
      SPECIAL: 'Senha deve conter pelo menos um caractere especial',
    },
  },
  
  CPF: {
    LENGTH: 11,
    MESSAGES: {
      INVALID: 'CPF inválido',
      REQUIRED: 'CPF é obrigatório',
      LENGTH: 'CPF deve ter 11 dígitos',
    },
  },
  
  EMAIL: {
    REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    MESSAGES: {
      INVALID: 'Email inválido',
      REQUIRED: 'Email é obrigatório',
    },
  },
  
  PHONE: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 11,
    MESSAGES: {
      INVALID: 'Telefone inválido',
      LENGTH: 'Telefone deve ter 10 ou 11 dígitos',
      MOBILE: 'Celular deve começar com 9',
    },
  },
  
  NAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 100,
    REGEX: /^[a-zA-ZÀ-ÿ\s]+$/,
    MESSAGES: {
      MIN_LENGTH: 'Nome deve ter no mínimo 3 caracteres',
      MAX_LENGTH: 'Nome deve ter no máximo 100 caracteres',
      INVALID: 'Nome deve conter apenas letras',
      FULL_NAME: 'Informe nome e sobrenome',
    },
  },
  
  TWO_FA_CODE: {
    LENGTH: 6,
    REGEX: /^\d{6}$/,
    MESSAGES: {
      INVALID: 'Código deve ter 6 dígitos',
      REQUIRED: 'Código é obrigatório',
    },
  },
  
  UUID: {
    REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    MESSAGES: {
      INVALID: 'ID inválido',
    },
  },
};