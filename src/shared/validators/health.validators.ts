import { z } from 'zod';

/**
 * Validador de CPF brasileiro
 */
export const cpfSchema = z.string().transform((val) => 
  val.replace(/\D/g, '')
).refine(
  (cpf) => {
    if (cpf.length !== 11) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    
    // Algoritmo de validação do CPF
    let sum = 0;
    let remainder;
    
    // Validação do primeiro dígito verificador
    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }
    
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;
    
    // Validação do segundo dígito verificador
    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }
    
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) return false;
    
    return true;
  },
  { message: 'CPF inválido' }
);

/**
 * Validador de CNPJ brasileiro
 */
export const cnpjSchema = z.string().transform((val) =>
  val.replace(/\D/g, '')
).refine(
  (cnpj) => {
    if (cnpj.length !== 14) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{13}$/.test(cnpj)) return false;
    
    // Validação do CNPJ
    let length = cnpj.length - 2;
    let numbers = cnpj.substring(0, length);
    const digits = cnpj.substring(length);
    let sum = 0;
    let pos = length - 7;
    
    for (let i = length; i >= 1; i--) {
      sum += parseInt(numbers.charAt(length - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    
    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) return false;
    
    length = length + 1;
    numbers = cnpj.substring(0, length);
    sum = 0;
    pos = length - 7;
    
    for (let i = length; i >= 1; i--) {
      sum += parseInt(numbers.charAt(length - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    
    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) return false;
    
    return true;
  },
  { message: 'CNPJ inválido' }
);

/**
 * Validador de CRM (Conselho Regional de Medicina)
 */
export const crmSchema = z.string().regex(
  /^\d{4,6}\/[A-Z]{2}$/,
  'CRM deve estar no formato 12345/UF (ex: 12345/SP)'
);

/**
 * Validador de CRP (Conselho Regional de Psicologia)
 */
export const crpSchema = z.string().regex(
  /^\d{2}\/\d{4,6}$/,
  'CRP deve estar no formato 00/000000 (ex: 06/123456)'
);

/**
 * Validador de CRF (Conselho Regional de Farmácia)
 */
export const crfSchema = z.string().regex(
  /^\d{4,6}$/,
  'CRF deve conter apenas números (4 a 6 dígitos)'
);

/**
 * Validador de CRN (Conselho Regional de Nutrição)
 */
export const crnSchema = z.string().regex(
  /^\d{1}\/\d{4,6}$/,
  'CRN deve estar no formato 0/00000 (ex: 3/12345)'
);

/**
 * Validador de CNS (Cartão Nacional de Saúde)
 */
export const cnsSchema = z.string().transform((val) =>
  val.replace(/\D/g, '')
).refine(
  (cns) => {
    if (cns.length !== 15) return false;
    
    // Validação do CNS
    if (cns.substring(0, 1) === '1' || cns.substring(0, 1) === '2') {
      // CNS começando com 1 ou 2
      let soma = 0;
      let resto, dv;
      let pis = cns.substring(0, 11);
      let resultado = '';
      
      for (let i = 0; i < 11; i++) {
        soma += parseInt(pis.charAt(i)) * (15 - i);
      }
      
      resto = soma % 11;
      dv = 11 - resto;
      
      if (dv === 11) dv = 0;
      if (dv === 10) {
        soma = 0;
        for (let i = 0; i < 11; i++) {
          soma += parseInt(pis.charAt(i)) * (15 - i);
        }
        soma += 2;
        resto = soma % 11;
        dv = 11 - resto;
        resultado = pis + '001' + dv.toString();
      } else {
        resultado = pis + '000' + dv.toString();
      }
      
      return cns === resultado;
    }
    
    // CNS começando com 7, 8 ou 9
    if (['7', '8', '9'].includes(cns.substring(0, 1))) {
      let soma = 0;
      for (let i = 0; i < 15; i++) {
        soma += parseInt(cns.charAt(i)) * (15 - i);
      }
      return soma % 11 === 0;
    }
    
    return false;
  },
  { message: 'CNS inválido' }
);

/**
 * Validador de telefone brasileiro
 */
export const phoneSchema = z.string().transform((val) => 
  val.replace(/\D/g, '')
).refine(
  (val) => val.length === 10 || val.length === 11,
  'Telefone deve ter 10 ou 11 dígitos'
);

/**
 * Validador de CEP brasileiro
 */
export const cepSchema = z.string().transform((val) =>
  val.replace(/\D/g, '')
).refine(
  (val) => val.length === 8,
  'CEP deve ter 8 dígitos'
);

/**
 * Validador de email
 */
export const emailSchema = z.string()
  .email('Email inválido')
  .toLowerCase()
  .refine(
    (email) => {
      // Lista de domínios de email temporários/descartáveis
      const disposableDomains = [
        'tempmail.com',
        'throwaway.email',
        '10minutemail.com',
        'guerrillamail.com',
        'mailinator.com',
      ];
      const domain = email.split('@')[1];
      return !disposableDomains.includes(domain);
    },
    { message: 'Emails temporários não são permitidos' }
  );