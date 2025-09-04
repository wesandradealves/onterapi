import { Injectable } from '@nestjs/common';
import { CPFValidator } from '../validators/cpf.validator';
import { EmailValidator } from '../validators/email.validator';
import { PhoneValidator } from '../validators/phone.validator';
import { CNPJValidator } from '../validators/cnpj.validator';
import { CEPValidator } from '../validators/cep.validator';
import { CRMValidator } from '../validators/crm.validator';
import { CNSValidator } from '../validators/cns.validator';
import { ISupabaseAuthService } from '../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { Inject } from '@nestjs/common';

@Injectable()
export class ValidationService {
  constructor(
    @Inject(ISupabaseAuthService)
    private readonly supabaseAuthService: ISupabaseAuthService,
  ) {}

  // CPF Validations
  validateCPF(cpf: string): boolean {
    return CPFValidator.isValid(cpf);
  }

  formatCPF(cpf: string): string {
    return CPFValidator.format(cpf);
  }

  cleanCPF(cpf: string): string {
    return CPFValidator.clean(cpf);
  }

  async checkCPFUnique(cpf: string, excludeId?: string): Promise<boolean> {
    const { data } = await this.supabaseAuthService.listUsers({ page: 1, perPage: 1000 });
    const users = data?.users || [];
    
    const existingUser = users.find(u => {
      const userCpf = u.user_metadata?.cpf;
      return userCpf === cpf && u.id !== excludeId;
    });
    
    return !existingUser;
  }

  // Email Validations
  validateEmail(email: string): boolean {
    return EmailValidator.isValid(email);
  }

  normalizeEmail(email: string): string {
    return EmailValidator.normalize(email);
  }

  maskEmail(email: string): string | null {
    return EmailValidator.mask(email);
  }

  async checkEmailUnique(email: string, excludeId?: string): Promise<boolean> {
    const { data } = await this.supabaseAuthService.listUsers({ page: 1, perPage: 1000 });
    const users = data?.users || [];
    
    const existingUser = users.find(u => u.email === email && u.id !== excludeId);
    return !existingUser;
  }

  // Phone Validations
  validatePhone(phone: string): boolean {
    return PhoneValidator.isValid(phone);
  }

  formatPhone(phone: string): string {
    return PhoneValidator.format(phone);
  }

  cleanPhone(phone: string): string {
    return PhoneValidator.clean(phone);
  }

  maskPhone(phone: string): string {
    return PhoneValidator.mask(phone);
  }

  // CNPJ Validations
  validateCNPJ(cnpj: string): boolean {
    return CNPJValidator.isValid(cnpj);
  }

  formatCNPJ(cnpj: string): string {
    return CNPJValidator.format(cnpj);
  }

  cleanCNPJ(cnpj: string): string {
    return CNPJValidator.clean(cnpj);
  }

  // CEP Validations
  validateCEP(cep: string): boolean {
    return CEPValidator.isValid(cep);
  }

  formatCEP(cep: string): string {
    return CEPValidator.format(cep);
  }

  cleanCEP(cep: string): string {
    return CEPValidator.clean(cep);
  }

  // CRM Validations
  validateCRM(crm: string): boolean {
    return CRMValidator.isValid(crm);
  }

  formatCRM(crm: string): string {
    return CRMValidator.format(crm);
  }

  // CNS Validations
  validateCNS(cns: string): boolean {
    return CNSValidator.isValid(cns);
  }

  formatCNS(cns: string): string {
    return CNSValidator.format(cns);
  }

  cleanCNS(cns: string): string {
    return CNSValidator.clean(cns);
  }

  // Generic Validations
  isRequired(value: any): boolean {
    return value !== null && value !== undefined && value !== '';
  }

  minLength(value: string, min: number): boolean {
    return value.length >= min;
  }

  maxLength(value: string, max: number): boolean {
    return value.length <= max;
  }

  isInRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
  }

  isDate(value: any): boolean {
    return value instanceof Date && !isNaN(value.getTime());
  }

  isFutureDate(value: Date): boolean {
    return this.isDate(value) && value > new Date();
  }

  isPastDate(value: Date): boolean {
    return this.isDate(value) && value < new Date();
  }
}