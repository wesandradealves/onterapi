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
      MIN_LENGTH: 'Senha deve ter no minimo 8 caracteres',
      LOWERCASE: 'Senha deve conter pelo menos uma letra minuscula',
      UPPERCASE: 'Senha deve conter pelo menos uma letra maiuscula',
      NUMBER: 'Senha deve conter pelo menos um numero',
      SPECIAL: 'Senha deve conter pelo menos um caractere especial',
    },
  },

  CPF: {
    LENGTH: 11,
    MESSAGES: {
      INVALID: 'CPF invalido',
      REQUIRED: 'CPF e obrigatorio',
      LENGTH: 'CPF deve ter 11 digitos',
    },
  },

  EMAIL: {
    REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    MESSAGES: {
      INVALID: 'Email invalido',
      REQUIRED: 'Email e obrigatorio',
    },
  },

  PHONE: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 11,
    MESSAGES: {
      INVALID: 'Telefone invalido',
      LENGTH: 'Telefone deve ter 10 ou 11 digitos',
      MOBILE: 'Celular deve comecar com 9',
    },
  },

  NAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 100,
    REGEX: /^[a-zA-Z - \s]+$/,
    MESSAGES: {
      MIN_LENGTH: 'Nome deve ter no minimo 3 caracteres',
      MAX_LENGTH: 'Nome deve ter no maximo 100 caracteres',
      INVALID: 'Nome deve conter apenas letras',
      FULL_NAME: 'Informe nome e sobrenome',
    },
  },

  TWO_FA_CODE: {
    LENGTH: 6,
    REGEX: /^\d{6}$/,
    MESSAGES: {
      INVALID: 'Codigo deve ter 6 digitos',
      REQUIRED: 'Codigo e obrigatorio',
    },
  },

  UUID: {
    REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    MESSAGES: {
      INVALID: 'ID invalido',
    },
  },
};
