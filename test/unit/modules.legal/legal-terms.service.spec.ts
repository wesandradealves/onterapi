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
  status: 'draft',
  isActive: false,
  createdBy: 'user-1',
  publishedAt: null,
  publishedBy: null,
  retiredAt: null,
  retiredBy: null,
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
    const draft = sampleTerm();
    repository.create.mockResolvedValue(draft);

    const result = await service.createTerm({
      context: draft.context,
      version: draft.version,
      content: draft.content,
      tenantId: null,
      createdBy: 'user-actor',
      publishNow: false,
    });

    expect(repository.create).toHaveBeenCalledWith({
      tenantId: null,
      context: draft.context,
      version: draft.version,
      content: draft.content,
      createdBy: 'user-actor',
    });
    expect(repository.publish).not.toHaveBeenCalled();
    expect(result).toEqual(draft);
  });

  it('publishes term immediately when publishNow=true', async () => {
    const draft = sampleTerm();
    const published = sampleTerm({
      status: 'published',
      isActive: true,
      publishedAt: new Date('2025-10-01T11:00:00Z'),
      publishedBy: 'user-actor',
    });
    repository.create.mockResolvedValue(draft);
    repository.publish.mockResolvedValue(published);

    const result = await service.createTerm({
      context: draft.context,
      version: draft.version,
      content: draft.content,
      tenantId: null,
      createdBy: 'user-actor',
      publishNow: true,
      publishBy: 'user-actor',
    });

    expect(repository.publish).toHaveBeenCalledWith({
      termId: draft.id,
      publishedAt: expect.any(Date),
      publishedBy: 'user-actor',
    });
    expect(result).toEqual(published);
  });

  it('throws conflict when duplicate version is created', async () => {
    repository.create.mockRejectedValue({ code: '23505' });

    await expect(
      service.createTerm({
        context: 'therapeutic_plan',
        version: 'v1',
        content: '...',
        createdBy: 'user-actor',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('publishes existing draft term', async () => {
    const draft = sampleTerm();
    const published = sampleTerm({ status: 'published', isActive: true });
    repository.findById.mockResolvedValueOnce(draft);
    repository.publish.mockResolvedValueOnce(published);

    const result = await service.publishTerm(draft.id, 'user-publisher');

    expect(repository.publish).toHaveBeenCalledWith({
      termId: draft.id,
      publishedAt: expect.any(Date),
      publishedBy: 'user-publisher',
    });
    expect(result.status).toBe('published');
  });

  it('throws conflict when publishing already active term', async () => {
    repository.findById.mockResolvedValueOnce(sampleTerm({ status: 'published', isActive: true }));

    await expect(service.publishTerm('term-1', 'user-publisher')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('throws not found when publishing unknown term', async () => {
    repository.findById.mockResolvedValueOnce(null);

    await expect(service.publishTerm('term-unknown', 'user-publisher')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('retires active term', async () => {
    const active = sampleTerm({ status: 'published', isActive: true });
    const retired = sampleTerm({ status: 'retired', isActive: false, retiredBy: 'user-retire' });
    repository.findById.mockResolvedValueOnce(active);
    repository.retire.mockResolvedValueOnce(retired);

    const result = await service.retireTerm(active.id, 'user-retire');

    expect(repository.retire).toHaveBeenCalledWith({
      termId: active.id,
      retiredAt: expect.any(Date),
      retiredBy: 'user-retire',
    });
    expect(result.status).toBe('retired');
  });

  it('throws conflict when retiring draft term', async () => {
    repository.findById.mockResolvedValueOnce(sampleTerm({ status: 'draft', isActive: false }));

    await expect(service.retireTerm('term-1', 'user-retire')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
