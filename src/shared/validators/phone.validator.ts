export class PhoneValidator {
  static isValid(phone: string): boolean {
    if (!phone) return false;
    
    const cleanPhone = this.clean(phone);
    
    if (cleanPhone.length < 10 || cleanPhone.length > 11) return false;
    
    if (cleanPhone.length === 11 && cleanPhone[2] !== '9') return false;
    
    const validDDDs = [
      '11', '12', '13', '14', '15', '16', '17', '18', '19',
      '21', '22', '24', '27', '28',
      '31', '32', '33', '34', '35', '37', '38',
      '41', '42', '43', '44', '45', '46', '47', '48', '49',
      '51', '53', '54', '55',
      '61', '62', '63', '64', '65', '66', '67', '68', '69',
      '71', '73', '74', '75', '77', '79',
      '81', '82', '83', '84', '85', '86', '87', '88', '89',
      '91', '92', '93', '94', '95', '96', '97', '98', '99',
    ];
    
    const ddd = cleanPhone.substring(0, 2);
    if (!validDDDs.includes(ddd)) return false;
    
    return true;
  }

  static clean(phone: string): string {
    return phone?.replace(/\D/g, '') || '';
  }

  static format(phone: string): string {
    const cleanPhone = this.clean(phone);
    
    if (cleanPhone.length === 10) {
      return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    
    if (cleanPhone.length === 11) {
      return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    
    return phone;
  }

  static isMobile(phone: string): boolean {
    const cleanPhone = this.clean(phone);
    return cleanPhone.length === 11 && cleanPhone[2] === '9';
  }

  static isLandline(phone: string): boolean {
    const cleanPhone = this.clean(phone);
    return cleanPhone.length === 10;
  }
}