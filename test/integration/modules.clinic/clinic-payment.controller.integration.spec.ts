import { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { RolesEnum } from '../../../src/domain/auth/enums/roles.enum';
import {
  GetClinicPaymentLedgerOutput,
  IGetClinicPaymentLedgerUseCase,
  IGetClinicPaymentLedgerUseCase as IGetClinicPaymentLedgerUseCaseToken,
} from '../../../src/domain/clinic/interfaces/use-cases/get-clinic-payment-ledger.use-case.interface';
import {
  ClinicPaymentLedgerListItem,
  IListClinicPaymentLedgersUseCase,
  IListClinicPaymentLedgersUseCase as IListClinicPaymentLedgersUseCaseToken,
} from '../../../src/domain/clinic/interfaces/use-cases/list-clinic-payment-ledgers.use-case.interface';
import { ClinicPaymentController } from '../../../src/modules/clinic/api/controllers/clinic-payment.controller';
import { ClinicPaymentLedger } from '../../../src/domain/clinic/types/clinic.types';
import { JwtAuthGuard } from '../../../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../src/modules/auth/guards/roles.guard';

class AllowAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    request.user = {
      id: 'user-1',
      tenantId: 'tenant-1',
      roles: [RolesEnum.CLINIC_OWNER],
    };
    return true;
  }
}

describe('ClinicPaymentController (integration)', () => {
  let app: INestApplication;
  let getLedgerUseCase: jest.Mocked<IGetClinicPaymentLedgerUseCase>;
  let listLedgersUseCase: jest.Mocked<IListClinicPaymentLedgersUseCase>;

  beforeEach(async () => {
    getLedgerUseCase = {
      execute: jest.fn(),
      executeOrThrow: jest.fn(),
    } as unknown as jest.Mocked<IGetClinicPaymentLedgerUseCase>;
    listLedgersUseCase = {
      execute: jest.fn(),
      executeOrThrow: jest.fn(),
    } as unknown as jest.Mocked<IListClinicPaymentLedgersUseCase>;

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ClinicPaymentController],
      providers: [
        {
          provide: IGetClinicPaymentLedgerUseCaseToken,
          useValue: getLedgerUseCase,
        },
        {
          provide: IListClinicPaymentLedgersUseCaseToken,
          useValue: listLedgersUseCase,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(AllowAuthGuard)
      .overrideGuard(RolesGuard)
      .useClass(AllowAuthGuard)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('retorna ledger quando o caso de uso resolve com sucesso', async () => {
    const ledger: ClinicPaymentLedger = {
      currency: 'BRL',
      lastUpdatedAt: '2099-01-01T12:00:00.000Z',
      events: [
        {
          type: 'settled',
          gatewayStatus: 'RECEIVED_IN_ADVANCE',
          recordedAt: '2099-01-01T12:00:00.000Z',
          sandbox: false,
        },
      ],
      settlement: {
        settledAt: '2099-01-01T12:00:00.000Z',
        baseAmountCents: 20000,
        netAmountCents: 18000,
        split: [],
        remainderCents: 0,
        gatewayStatus: 'RECEIVED_IN_ADVANCE',
      },
    };

    const output: GetClinicPaymentLedgerOutput = {
      appointmentId: 'appointment-1',
      clinicId: 'clinic-1',
      tenantId: 'tenant-1',
      paymentStatus: 'settled',
      paymentTransactionId: 'pay-123',
      ledger,
    };

    getLedgerUseCase.executeOrThrow.mockResolvedValue(output);

    const response = await request(app.getHttpServer())
      .get('/clinics/clinic-1/payments/appointment-1/ledger')
      .set('x-tenant-id', 'tenant-1')
      .expect(200);

    expect(getLedgerUseCase.executeOrThrow).toHaveBeenCalledWith({
      clinicId: 'clinic-1',
      appointmentId: 'appointment-1',
      tenantId: 'tenant-1',
    });

    expect(response.body).toMatchObject({
      appointmentId: 'appointment-1',
      paymentStatus: 'settled',
      paymentTransactionId: 'pay-123',
      ledger: {
        currency: 'BRL',
        events: expect.arrayContaining([
          expect.objectContaining({ type: 'settled', gatewayStatus: 'RECEIVED_IN_ADVANCE' }),
        ]),
      },
    });
  });

  it('usa tenant do usuário autenticado quando cabeçalho não é informado', async () => {
    getLedgerUseCase.executeOrThrow.mockResolvedValue({
      appointmentId: 'appointment-2',
      clinicId: 'clinic-1',
      tenantId: 'tenant-1',
      paymentStatus: 'approved',
      paymentTransactionId: 'pay-456',
      ledger: {
        currency: 'BRL',
        lastUpdatedAt: new Date().toISOString(),
        events: [],
      },
    });

    await request(app.getHttpServer())
      .get('/clinics/clinic-1/payments/appointment-2/ledger')
      .expect(200);

    expect(getLedgerUseCase.executeOrThrow).toHaveBeenCalledWith({
      clinicId: 'clinic-1',
      appointmentId: 'appointment-2',
      tenantId: 'tenant-1',
    });
  });

  it('lista ledger de pagamentos filtrando por status', async () => {
    const items: ClinicPaymentLedgerListItem[] = [
      {
        appointmentId: 'appointment-3',
        clinicId: 'clinic-1',
        tenantId: 'tenant-1',
        serviceTypeId: 'service-1',
        professionalId: 'professional-1',
        paymentStatus: 'settled',
        paymentTransactionId: 'pay-789',
        confirmedAt: new Date('2099-01-03T10:00:00Z'),
        ledger: {
          currency: 'BRL',
          lastUpdatedAt: '2099-01-03T12:00:00Z',
          events: [],
        },
      },
    ];

    listLedgersUseCase.executeOrThrow.mockResolvedValue(items);

    const response = await request(app.getHttpServer())
      .get('/clinics/clinic-1/payments?paymentStatus=settled,refunded&limit=5&offset=10')
      .set('x-tenant-id', 'tenant-1')
      .expect(200);

    expect(listLedgersUseCase.executeOrThrow).toHaveBeenCalledWith({
      clinicId: 'clinic-1',
      tenantId: 'tenant-1',
      paymentStatuses: ['settled', 'refunded'],
      fromConfirmedAt: undefined,
      toConfirmedAt: undefined,
      limit: 5,
      offset: 10,
    });

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toMatchObject({
      appointmentId: 'appointment-3',
      paymentStatus: 'settled',
    });
  });
});
