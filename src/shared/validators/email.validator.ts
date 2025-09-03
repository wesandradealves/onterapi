export class EmailValidator {
  private static readonly EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  static isValid(email: string): boolean {
    if (!email) return false;
    
    const trimmedEmail = email.trim().toLowerCase();
    
    if (trimmedEmail.length > 254) return false;
    
    if (!this.EMAIL_REGEX.test(trimmedEmail)) return false;
    
    const [localPart, domain] = trimmedEmail.split('@');
    
    if (localPart.length > 64) return false;
    
    if (domain.startsWith('-') || domain.endsWith('-')) return false;
    
    if (domain.includes('..')) return false;
    
    return true;
  }

  static normalize(email: string): string {
    return email?.trim().toLowerCase() || '';
  }

  static getDomain(email: string): string | null {
    if (!this.isValid(email)) return null;
    
    return email.split('@')[1].toLowerCase();
  }

  static getLocalPart(email: string): string | null {
    if (!this.isValid(email)) return null;
    
    return email.split('@')[0].toLowerCase();
  }
}