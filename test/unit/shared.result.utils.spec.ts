import { failure, success, unwrapResult } from '@shared/types/result.type';

describe('unwrapResult', () => {
  it('retorna dados quando resultado bem-sucedido', () => {
    const result = success({ id: '123' });
    expect(unwrapResult(result)).toEqual({ id: '123' });
  });

  it('propaga erro quando resultado falho', () => {
    const error = new Error('fail');
    const result = failure(error);
    expect(() => unwrapResult(result)).toThrow(error);
  });

  it('aceita resultados void', () => {
    expect(() => unwrapResult(success<void>(undefined))).not.toThrow();
  });
});
