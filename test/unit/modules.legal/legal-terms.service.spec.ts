import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { LegalTermsService } from '../../../src/modules/legal/legal-terms.service';
import { ILegalTermsRepository } from '../../../src/domain/legal/interfaces/legal-terms.repository.interface';
import { LegalTerm } from '../../../src/domain/legal/types/legal-term.types';

const sampleTerm = (overrides: Partial<LegalTerm> = {}): LegalTerm => ({
  id: 'term-1',
  tenantId: null,
  context: 'therapeutic_plan',
  version: 'v1',
  content: 'Termo exemplo',
  isActive: false,
  publishedAt: null,
  createdAt: new Date('2025-10-01T10:00:00Z'),
  updatedAt: new Date('2025-10-01T10:00:00Z'),
  ...overrides,
});

describe('LegalTermsService', () => {
  let repository: jest.Mocked<ILegalTermsRepository>;
  let service: LegalTermsService;

  beforeEach(() => {
    repository = {
      findActiveByContext: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      publish: jest.fn(),
      retire: jest.fn(),
    } as unknown as jest.Mocked<ILegalTermsRepository>;

    service = new LegalTermsService(repository);
  });

  it('creates draft term when publishNow=false', async () => {
    const created = sampleTerm();
    repository.create.mockResolvedValue(created);

    const result = await service.createTerm({
      context: created.context,
      version: created.version,
      content: created.content,
    });

    expect(repository.create).toHaveBeenCalledWith({
      tenantId: null,
      context: created.context,
      version: created.version,
      content: created.content,
    });
    expect(repository.publish).not.toHaveBeenCalled();
    expect(result).toEqual(created);
  });

  it('publishes term immediately when publishNow=true', async () => {
    const draft = sampleTerm();
    const published = sampleTerm({ isActive: true, publishedAt: new Date('2025-10-01T11:00:00Z') });
    repository.create.mockResolvedValue(draft);
    repository.publish.mockResolvedValue(published);

    const result = await service.createTerm({
      context: draft.context,
      version: draft.version,
      content: draft.content,
      publishNow: true,
    });

    expect(repository.publish).toHaveBeenCalledWith({
      termId: draft.id,
      publishedAt: expect.any(Date),
    });
    expect(result).toEqual(published);
  });

  it('throws conflict when duplicate version is created', async () => {
    repository.create.mockRejectedValue({ code: '23505' });

    await expect(
      service.createTerm({ context: 'therapeutic_plan', version: 'v1', content: '...' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('publishes existing draft term', async () => {
    const draft = sampleTerm();
    const published = sampleTerm({ isActive: true });
    repository.findById.mockResolvedValueOnce(draft);
    repository.publish.mockResolvedValueOnce(published);

    const result = await service.publishTerm(draft.id);

    expect(repository.publish).toHaveBeenCalledWith({
      termId: draft.id,
      publishedAt: expect.any(Date),
    });
    expect(result.isActive).toBe(true);
  });

  it('throws conflict when publishing already active term', async () => {
    repository.findById.mockResolvedValueOnce(sampleTerm({ isActive: true }));

    await expect(service.publishTerm('term-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws not found when publishing unknown term', async () => {
    repository.findById.mockResolvedValueOnce(null);

    await expect(service.publishTerm('term-unknown')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('retires active term', async () => {
    const active = sampleTerm({ isActive: true });
    const retired = sampleTerm({ isActive: false });
    repository.findById.mockResolvedValueOnce(active);
    repository.retire.mockResolvedValueOnce(retired);

    const result = await service.retireTerm(active.id);

    expect(repository.retire).toHaveBeenCalledWith({ termId: active.id });
    expect(result.isActive).toBe(false);
  });

  it('throws conflict when retiring draft term', async () => {
    repository.findById.mockResolvedValueOnce(sampleTerm({ isActive: false }));

    await expect(service.retireTerm('term-1')).rejects.toBeInstanceOf(BadRequestException);
  });
});
