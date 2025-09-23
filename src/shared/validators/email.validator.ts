export class EmailValidator {
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  static isValid(email: string): boolean {
    if (!email) return false;
    return this.EMAIL_REGEX.test(email.toLowerCase());
  }

  static normalize(email: string): string {
    if (!email) return '';
    return email.toLowerCase().trim();
  }

  static getDomain(email: string): string | null {
    if (!this.isValid(email)) return null;
    return email.split('@')[1]?.toLowerCase() || null;
  }

  static mask(email: string): string | null {
    if (!this.isValid(email)) return null;

    const [local, domain] = email.split('@');
    const visibleChars = Math.min(3, Math.floor(local.length / 2));
    const maskedLocal =
      local.substring(0, visibleChars) + '*'.repeat(Math.max(local.length - visibleChars, 3));

    return `${maskedLocal}@${domain}`;
  }
}
