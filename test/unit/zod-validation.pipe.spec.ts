import { BadRequestException, Logger } from '@nestjs/common';
import { ZodValidationPipe } from '@shared/pipes/zod-validation.pipe';
import { z } from 'zod';

describe('ZodValidationPipe', () => {
  const schema = z.object({ name: z.string().min(1) });

  it('retorna valor parseado quando valido', () => {
    const pipe = new ZodValidationPipe(schema);
    const result = pipe.transform({ name: 'Teste' }, { type: 'body' } as any);
    expect(result).toEqual({ name: 'Teste' });
  });

  it('lanca BadRequest e registra no logger quando invalido', () => {
    const pipe = new ZodValidationPipe(schema);
    const loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    expect(() => pipe.transform({ name: '' }, { type: 'body' } as any)).toThrow(BadRequestException);
    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Zod validation errors'));

    loggerSpy.mockRestore();
  });
  it('ignora validacao para tipos nao suportados', () => {
    const pipe = new ZodValidationPipe(schema);
    const payload = { name: '' };

    const result = pipe.transform(payload, { type: 'custom' } as any);

    expect(result).toBe(payload);
  });

  it('encapsula erros nao Zod em BadRequest generico', () => {
    const nonZodSchema = {
      parse: jest.fn(() => {
        throw new Error('boom');
      }),
    } as any;

    const pipe = new ZodValidationPipe(nonZodSchema);

    expect(() => pipe.transform({}, { type: 'body' } as any)).toThrow('Validation failed');
  });
});

