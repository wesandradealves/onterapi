import { z } from 'zod';

/**
 * Valida CPF brasileiro
 */
function validateCPF(cpf: string): boolean {
  const cleanCpf = cpf.replace(/\D/g, '');
  
  if (cleanCpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCpf)) return false;

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCpf.substring(i - 1, i)) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCpf.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCpf.substring(i - 1, i)) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCpf.substring(10, 11))) return false;

  return true;
}

/**
 * Schema para validação de CPF
 */
export const cpfSchema = z
  .string()
  .transform((val) => val.replace(/\D/g, ''))
  .refine((val) => val.length === 11, {
    message: 'CPF deve ter 11 dígitos',
  })
  .refine(validateCPF, {
    message: 'CPF inválido',
  });

/**
 * Schema para validação de email
 */
export const emailSchema = z
  .string()
  .email('Email inválido')
  .toLowerCase()
  .trim();

/**
 * Schema para validação de senha forte
 */
export const passwordSchema = z
  .string()
  .min(8, 'Senha deve ter no mínimo 8 caracteres')
  .regex(/(?=.*[a-z])/, 'Senha deve conter pelo menos uma letra minúscula')
  .regex(/(?=.*[A-Z])/, 'Senha deve conter pelo menos uma letra maiúscula')
  .regex(/(?=.*[0-9])/, 'Senha deve conter pelo menos um número')
  .regex(/(?=.*[!@#$%^&*])/, 'Senha deve conter pelo menos um caractere especial');

/**
 * Schema para validação de telefone brasileiro
 */
export const phoneSchema = z
  .string()
  .transform((val) => val.replace(/\D/g, ''))
  .refine((val) => val.length === 10 || val.length === 11, {
    message: 'Telefone deve ter 10 ou 11 dígitos',
  })
  .refine((val) => {
    if (val.length === 11) {
      return val[2] === '9';
    }
    return true;
  }, {
    message: 'Celular deve começar com 9',
  });

/**
 * Schema para validação de nome completo
 */
export const fullNameSchema = z
  .string()
  .min(3, 'Nome deve ter no mínimo 3 caracteres')
  .max(100, 'Nome deve ter no máximo 100 caracteres')
  .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras')
  .transform((val) => val.trim())
  .refine((val) => val.split(' ').length >= 2, {
    message: 'Informe nome e sobrenome',
  });

/**
 * Schema para UUID
 */
export const uuidSchema = z.string().uuid('ID inválido');

/**
 * Schema para código 2FA
 */
export const twoFactorCodeSchema = z
  .string()
  .length(6, 'Código deve ter 6 dígitos')
  .regex(/^\d{6}$/, 'Código deve conter apenas números');