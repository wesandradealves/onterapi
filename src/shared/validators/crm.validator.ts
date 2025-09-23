export class CRMValidator {
  private static readonly VALID_UFS = [
    'AC',
    'AL',
    'AP',
    'AM',
    'BA',
    'CE',
    'DF',
    'ES',
    'GO',
    'MA',
    'MT',
    'MS',
    'MG',
    'PA',
    'PB',
    'PR',
    'PE',
    'PI',
    'RJ',
    'RN',
    'RS',
    'RO',
    'RR',
    'SC',
    'SP',
    'SE',
    'TO',
  ];

  static isValid(crm: string): boolean {
    if (!crm) return false;

    const cleanCrm = this.clean(crm);

    const match = cleanCrm.match(/^(\d{4,6})([A-Z]{2})$/);
    if (!match) return false;

    const [, number, uf] = match;

    if (parseInt(number) === 0) return false;

    return this.VALID_UFS.includes(uf);
  }

  static clean(crm: string): string {
    if (!crm) return '';

    return crm
      .toUpperCase()
      .replace(/[^\dA-Z]/g, '')
      .replace(/^0+/, '');
  }

  static format(crm: string): string {
    const cleanCrm = this.clean(crm);

    const match = cleanCrm.match(/^(\d{4,6})([A-Z]{2})$/);
    if (!match) return crm;

    const [, number, uf] = match;

    return `${number.padStart(6, '0')}/${uf}`;
  }

  static extractUF(crm: string): string | null {
    const cleanCrm = this.clean(crm);

    const match = cleanCrm.match(/^(\d{4,6})([A-Z]{2})$/);
    if (!match) return null;

    return match[2];
  }

  static extractNumber(crm: string): string | null {
    const cleanCrm = this.clean(crm);

    const match = cleanCrm.match(/^(\d{4,6})([A-Z]{2})$/);
    if (!match) return null;

    return match[1];
  }
}
