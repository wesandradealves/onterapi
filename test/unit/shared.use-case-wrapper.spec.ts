import { Logger } from '@nestjs/common';
import { UseCaseWrapper } from '@shared/use-cases/use-case-wrapper';
import { unwrapResult } from '@shared/types/result.type';

describe('UseCaseWrapper', () => {
  it('executa handler e retorna resultado', async () => {
    const logger = { error: jest.fn() } as unknown as Logger;
    const handler = jest.fn().mockResolvedValue({ success: true });

    const wrapper = new UseCaseWrapper<{ value: number }, { success: boolean }>(logger, handler);

    const result = unwrapResult(await wrapper.execute({ value: 1 }));

    expect(handler).toHaveBeenCalledWith({ value: 1 });
    expect(result).toEqual({ success: true });
  });

  it('retorna erro e registra log quando handler falha', async () => {
    const logger = { error: jest.fn() } as unknown as Logger;
    const handler = jest.fn().mockRejectedValue(new Error('failure'));

    const wrapper = new UseCaseWrapper<{ value: number }, { success: boolean }>(logger, handler);

    const result = await wrapper.execute({ value: 2 });

    expect(result.data).toBeUndefined();
    expect(result.error).toBeInstanceOf(Error);
    expect(logger.error).toHaveBeenCalledWith('Error in InternalUseCase', expect.any(Error));
  });
});
