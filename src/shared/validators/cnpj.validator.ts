export class CNPJValidator {
  static isValid(cnpj: string): boolean {
    if (!cnpj) return false;

    const cleanCnpj = this.clean(cnpj);

    if (cleanCnpj.length !== 14) return false;

    if (/^(\d)\1{13}$/.test(cleanCnpj)) return false;

    let length = cleanCnpj.length - 2;
    let numbers = cleanCnpj.substring(0, length);
    const digits = cleanCnpj.substring(length);
    let sum = 0;
    let pos = length - 7;

    for (let i = length; i >= 1; i--) {
      sum += parseInt(numbers.charAt(length - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) return false;

    length = length + 1;
    numbers = cleanCnpj.substring(0, length);
    sum = 0;
    pos = length - 7;

    for (let i = length; i >= 1; i--) {
      sum += parseInt(numbers.charAt(length - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) return false;

    return true;
  }

  static clean(cnpj: string): string {
    return cnpj?.replace(/\D/g, '') || '';
  }

  static format(cnpj: string): string {
    const cleanCnpj = this.clean(cnpj);

    if (cleanCnpj.length !== 14) return cnpj;

    return cleanCnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  static mask(cnpj: string): string {
    const formatted = this.format(cnpj);
    if (formatted === cnpj) return cnpj;

    return formatted.replace(/^\d{2}\.\d{3}/, '**.***');
  }
}
