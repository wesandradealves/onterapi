export class CEPValidator {
  static isValid(cep: string): boolean {
    if (!cep) return false;

    const cleanCep = this.clean(cep);
    return cleanCep.length === 8 && /^\d{8}$/.test(cleanCep);
  }

  static clean(cep: string): string {
    return cep?.replace(/\D/g, '') || '';
  }

  static format(cep: string): string {
    const cleanCep = this.clean(cep);

    if (cleanCep.length !== 8) return cep;

    return cleanCep.replace(/(\d{5})(\d{3})/, '$1-$2');
  }

  static getState(cep: string): string | null {
    const cleanCep = this.clean(cep);
    if (!this.isValid(cleanCep)) return null;

    const firstDigit = parseInt(cleanCep[0]);

    const stateMap: { [key: number]: string[] } = {
      0: ['SP'],
      1: ['SP'],
      2: ['RJ', 'ES'],
      3: ['MG'],
      4: ['BA', 'SE'],
      5: ['PE', 'AL', 'PB', 'RN'],
      6: ['CE', 'PI', 'MA', 'PA', 'AP', 'AM', 'RR', 'AC', 'RO'],
      7: ['DF', 'GO', 'TO', 'MT', 'MS'],
      8: ['PR', 'SC'],
      9: ['RS'],
    };

    return stateMap[firstDigit]?.[0] || null;
  }
}
