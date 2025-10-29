import { Logger } from '@nestjs/common';

import {
  ClinicAuditService,
  RegisterClinicAuditLogParams,
} from '../../../src/infrastructure/clinic/services/clinic-audit.service';
import {
  ClinicAuditLog,
  CreateClinicAuditLogInput,
} from '../../../src/domain/clinic/types/clinic.types';
import { IClinicAuditLogRepository } from '../../../src/domain/clinic/interfaces/repositories/clinic-audit-log.repository.interface';

describe('ClinicAuditService', () => {
  let service: ClinicAuditService;
  let repository: IClinicAuditLogRepository;
  const createMock = jest.fn<Promise<ClinicAuditLog>, [CreateClinicAuditLogInput]>();

  beforeEach(() => {
    createMock.mockReset();
    repository = {
      create: createMock,
    };
    service = new ClinicAuditService(repository);
  });

  it('deve persistir o log de auditoria com detalhe padrao', async () => {
    createMock.mockResolvedValueOnce({
      id: 'log-1',
      tenantId: 'tenant-1',
      clinicId: 'clinic-1',
      event: 'clinic.created',
      performedBy: 'user-1',
      detail: {},
      createdAt: new Date(),
    });

    const params: RegisterClinicAuditLogParams = {
      tenantId: 'tenant-1',
      clinicId: 'clinic-1',
      event: 'clinic.created',
      performedBy: 'user-1',
      detail: { foo: 'bar' },
    };

    await service.register(params);

    expect(createMock).toHaveBeenCalledWith({
      tenantId: params.tenantId,
      clinicId: params.clinicId,
      event: params.event,
      performedBy: params.performedBy,
      detail: params.detail,
    });
  });

  it('nao deve lancar erro se o repositorio falhar', async () => {
    const logSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    createMock.mockRejectedValueOnce(new Error('db down'));

    await service.register({
      tenantId: 'tenant-1',
      event: 'clinic.test',
    });

    expect(createMock).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      clinicId: undefined,
      event: 'clinic.test',
      performedBy: undefined,
      detail: {},
    });
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
