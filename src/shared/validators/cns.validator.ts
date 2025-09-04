export class CNSValidator {
  static isValid(cns: string): boolean {
    if (!cns) return false;
    
    const cleanCns = this.clean(cns);
    
    if (cleanCns.length !== 15) return false;
    
    const firstDigit = cleanCns[0];
    
    if (['1', '2'].includes(firstDigit)) {
      return this.validateDefinitive(cleanCns);
    }
    
    if (['7', '8', '9'].includes(firstDigit)) {
      return this.validateProvisional(cleanCns);
    }
    
    return false;
  }

  private static validateDefinitive(cns: string): boolean {
    let sum = 0;
    
    for (let i = 0; i < 15; i++) {
      sum += parseInt(cns[i]) * (15 - i);
    }
    
    return sum % 11 === 0;
  }

  private static validateProvisional(cns: string): boolean {
    let sum = 0;
    
    for (let i = 0; i < 15; i++) {
      sum += parseInt(cns[i]) * (15 - i);
    }
    
    let rest = sum % 11;
    
    if (rest !== 0) {
      sum += 11 - rest;
    }
    
    return sum % 11 === 0;
  }

  static clean(cns: string): string {
    return cns?.replace(/\D/g, '') || '';
  }

  static format(cns: string): string {
    const cleanCns = this.clean(cns);
    
    if (cleanCns.length !== 15) return cns;
    
    return cleanCns.replace(
      /(\d{3})(\d{4})(\d{4})(\d{4})/,
      '$1 $2 $3 $4'
    );
  }

  static getType(cns: string): string | null {
    const cleanCns = this.clean(cns);
    
    if (!this.isValid(cleanCns)) return null;
    
    const firstDigit = cleanCns[0];
    
    if (['1', '2'].includes(firstDigit)) {
      return 'DEFINITIVO';
    }
    
    if (['7', '8', '9'].includes(firstDigit)) {
      return 'PROVISORIO';
    }
    
    return null;
  }
}