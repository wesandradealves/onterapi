export class CPFValidator {
  static isValid(cpf: string): boolean {
    if (!cpf) return false;

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

  static clean(cpf: string): string {
    return cpf?.replace(/\D/g, '') || '';
  }

  static format(cpf: string): string {
    const cleanCpf = this.clean(cpf);
    if (cleanCpf.length !== 11) return cpf;

    return cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
}
