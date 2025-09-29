import { Logger } from '@nestjs/common';
import { UseCaseWrapper } from '@shared/use-cases/use-case-wrapper';
describe('UseCaseWrapper', () => {
  it('executa handler e retorna resultado', async () => {
    const logger = { error: jest.fn() } as unknown as Logger;
    const handler = jest.fn().mockResolvedValue({ success: true });

    const wrapper = new UseCaseWrapper<{ value: number }, { success: boolean }>(logger, handler);

    const result = await wrapper.executeOrThrow({ value: 1 });

    expect(handler).toHaveBeenCalledWith({ value: 1 });
    expect(result).toEqual({ success: true });
  });

  it('lança erro e registra log quando handler falha', async () => {
    const logger = { error: jest.fn() } as unknown as Logger;
    const failure = new Error('failure');
    const handler = jest.fn().mockRejectedValue(failure);

    const wrapper = new UseCaseWrapper<{ value: number }, { success: boolean }>(logger, handler);

    await expect(wrapper.execute({ value: 2 })).rejects.toThrow(failure);
    expect(logger.error).toHaveBeenCalledWith('Error in InternalUseCase', failure);
  });
});
