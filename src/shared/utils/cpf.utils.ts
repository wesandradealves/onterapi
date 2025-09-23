import { CPFValidator } from '../validators/cpf.validator';

export class CPFUtils {
  static mask(cpf: string | null | undefined): string {
    if (!cpf) return '';

    const cleanCpf = CPFValidator.clean(cpf);

    if (cleanCpf.length !== 11) return cpf;

    return `${cleanCpf.slice(0, 3)}.***.***.${cleanCpf.slice(-2)}`;
  }

  static unmask(cpf: string): string {
    return CPFValidator.clean(cpf);
  }

  static format(cpf: string): string {
    return CPFValidator.format(cpf);
  }

  static validate(cpf: string): boolean {
    return CPFValidator.isValid(cpf);
  }
}
