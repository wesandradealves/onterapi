import { z } from 'zod';
import { CPFValidator } from './cpf.validator';

export const cpfSchema = z
  .string()
  .transform((val) => val.replace(/\D/g, ''))
  .refine((val) => val.length === 11, {
    message: 'CPF deve ter 11 dígitos',
  })
  .refine((cpf) => CPFValidator.isValid(cpf), {
    message: 'CPF inválido',
  });

export const emailSchema = z.string().email('Email inválido').toLowerCase().trim();

export const passwordSchema = z
  .string()
  .min(8, 'Senha deve ter no mínimo 8 caracteres')
  .regex(/(?=.*[a-z])/, 'Senha deve conter pelo menos uma letra minúscula')
  .regex(/(?=.*[A-Z])/, 'Senha deve conter pelo menos uma letra maiúscula')
  .regex(/(?=.*[0-9])/, 'Senha deve conter pelo menos um número')
  .regex(/(?=.*[!@#$%^&*])/, 'Senha deve conter pelo menos um caractere especial');

export const phoneSchema = z
  .string()
  .transform((val) => val.replace(/\D/g, ''))
  .refine((val) => val.length === 10 || val.length === 11, {
    message: 'Telefone deve ter 10 ou 11 dígitos',
  })
  .refine(
    (val) => {
      if (val.length === 11) {
        return val[2] === '9';
      }
      return true;
    },
    {
      message: 'Celular deve começar com 9',
    },
  );

export const fullNameSchema = z
  .string()
  .min(3, 'Nome deve ter no mínimo 3 caracteres')
  .max(100, 'Nome deve ter no máximo 100 caracteres')
  .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras')
  .transform((val) => val.trim())
  .refine((val) => val.split(' ').length >= 2, {
    message: 'Informe nome e sobrenome',
  });

export const uuidSchema = z.string().uuid('ID inválido');

export const twoFactorCodeSchema = z
  .string()
  .length(6, 'Código deve ter 6 dígitos')
  .regex(/^\d{6}$/, 'Código deve conter apenas números');

export const cpfValidator = cpfSchema;
export const passwordValidator = passwordSchema;
export const phoneValidator = phoneSchema;
