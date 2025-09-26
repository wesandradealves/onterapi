import { CPFValidator } from '@shared/validators/cpf.validator';

describe('CPFValidator', () => {
  it('retorna false para valores vazios ou tamanho incorreto', () => {
    expect(CPFValidator.isValid('')).toBe(false);
    expect(CPFValidator.isValid('1234567890')).toBe(false);
  });

  it('retorna false para sequencias repetidas', () => {
    expect(CPFValidator.isValid('11111111111')).toBe(false);
  });

  it('retorna false para digitos verificadores invalidos', () => {
    expect(CPFValidator.isValid('39053344715')).toBe(false);
    expect(CPFValidator.isValid('12345678902')).toBe(false);
  });

  it('retorna true para CPF valido', () => {
    expect(CPFValidator.isValid('39053344705')).toBe(true);
    expect(CPFValidator.isValid('390.533.447-05')).toBe(true);
  });

  it('limpa caracteres nao numericos', () => {
    expect(CPFValidator.clean('390.533.447-05')).toBe('39053344705');
    expect(CPFValidator.clean(undefined as unknown as string)).toBe('');
  });

  it('formata apenas quando tamanho correto', () => {
    expect(CPFValidator.format('39053344705')).toBe('390.533.447-05');
    expect(CPFValidator.format('123')).toBe('123');
  });

  it('aceita CPF com resto ajustado para zero', () => {
    expect(CPFValidator.isValid('00000000604')).toBe(true);
    expect(CPFValidator.isValid('00000001830')).toBe(true);
  });
});
