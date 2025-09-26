import { CPFUtils } from '@shared/utils/cpf.utils';

describe('CPFUtils', () => {
  it('mascara CPF valido mantendo ultimos digitos', () => {
    expect(CPFUtils.mask('39053344705')).toBe('390.***.***.05');
  });

  it('retorna string vazia quando CPF indefinido', () => {
    expect(CPFUtils.mask(undefined)).toBe('');
  });

  it('nao aplica mascara quando CPF invalido', () => {
    expect(CPFUtils.mask('123')).toBe('123');
  });

  it('remove formatacao com unmask', () => {
    expect(CPFUtils.unmask('390.533.447-05')).toBe('39053344705');
  });

  it('formata CPF numerico', () => {
    expect(CPFUtils.format('39053344705')).toBe('390.533.447-05');
  });

  it('valida CPF real e rejeita repeticao', () => {
    expect(CPFUtils.validate('390.533.447-05')).toBe(true);
    expect(CPFUtils.validate('111.111.111-11')).toBe(false);
  });
});
