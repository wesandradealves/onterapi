import { ExecutionContext, INestApplication, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { UsersController } from '@modules/users/api/controllers/users.controller';
import { RolesEnum } from '@domain/auth/enums/roles.enum';
import { ICurrentUser } from '@domain/auth/interfaces/current-user.interface';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { UserOwnerGuard } from '@modules/users/guards/user-owner.guard';
import { ICreateUserUseCase } from '@domain/users/interfaces/use-cases/create-user.use-case.interface';
import { IFindAllUsersUseCase } from '@domain/users/interfaces/use-cases/find-all-users.use-case.interface';
import {
  FindUserBySlugUseCaseToken,
  IFindUserBySlugUseCase,
} from '@domain/users/interfaces/use-cases/find-user-by-slug.use-case.interface';
import { IUpdateUserUseCase } from '@domain/users/interfaces/use-cases/update-user.use-case.interface';
import { IDeleteUserUseCase } from '@domain/users/interfaces/use-cases/delete-user.use-case.interface';
import { UserEntity } from '@infrastructure/auth/entities/user.entity';

const DEFAULT_TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';

function buildUser(partial: Partial<UserEntity> = {}): UserEntity {
  const now = new Date('2025-03-10T12:00:00.000Z');
  return {
    id: 'user-1',
    slug: 'ana-souza',
    supabaseId: 'supabase-1',
    email: 'ana@example.com',
    name: 'Ana Souza',
    cpf: '39053344705',
    phone: '11999990000',
    role: RolesEnum.SECRETARY,
    tenantId: partial.tenantId ?? DEFAULT_TENANT_ID,
    twoFactorEnabled: false,
    isActive: true,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
    password_hash: undefined,
    twoFactorSecret: undefined,
    backupCodes: undefined,
    emailVerificationToken: undefined,
    emailVerificationSentAt: undefined,
    emailVerifiedAt: now,
    failedLoginAttempts: 0,
    lockedUntil: undefined,
    metadata: { slug: 'ana-souza' },
    deletedAt: undefined,
    sessions: [],
    permissions: [],
    ...partial,
  } as UserEntity;
}

function makeUseCaseMock<T>() {
  const execute = jest.fn();
  const executeOrThrow = jest.fn(async (...args: any[]) => {
    const result = await execute(...args);

    if (result && typeof result === 'object' && 'error' in result && result.error) {
      throw result.error;
    }

    return result ? (result as any).data : undefined;
  });

  return { execute, executeOrThrow } as unknown as jest.Mocked<T>;
}

describe('UsersController (integration)', () => {
  let app: INestApplication;

  const currentUser: ICurrentUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    name: 'Admin',
    role: RolesEnum.SUPER_ADMIN,
    tenantId: DEFAULT_TENANT_ID,
    sessionId: 'session-1',
    metadata: { slug: 'admin-slug' },
  } as ICurrentUser;

  const createUseCase = makeUseCaseMock<ICreateUserUseCase>();
  const findAllUseCase = makeUseCaseMock<IFindAllUsersUseCase>();
  const findBySlugUseCase = makeUseCaseMock<IFindUserBySlugUseCase>();
  const updateUseCase = makeUseCaseMock<IUpdateUserUseCase>();
  const deleteUseCase = makeUseCaseMock<IDeleteUserUseCase>();

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: 'ICreateUserUseCase', useValue: createUseCase },
        { provide: 'IFindAllUsersUseCase', useValue: findAllUseCase },
        { provide: FindUserBySlugUseCaseToken, useValue: findBySlugUseCase },
        { provide: 'IUpdateUserUseCase', useValue: updateUseCase },
        { provide: 'IDeleteUserUseCase', useValue: deleteUseCase },
        RolesGuard,
        UserOwnerGuard,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest();
          request.user = currentUser;
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest();
          request.user = currentUser;
          return true;
        },
      })
      .overrideGuard(UserOwnerGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest();
          request.user = currentUser;
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
    currentUser.role = RolesEnum.SUPER_ADMIN;
    currentUser.tenantId = DEFAULT_TENANT_ID;
    currentUser.metadata = { slug: 'admin-slug' };
  });

  it('cria usu�rio mapeando payload via mapper compartilhado', async () => {
    const createdUser = buildUser();
    createUseCase.execute.mockResolvedValue({ data: createdUser });

    await request(app.getHttpServer())
      .post('/users')
      .send({
        email: 'ana@example.com',
        password: 'SenhaForte123!',
        name: 'Ana Souza',
        cpf: '39053344705',
        phone: '11999990000',
        role: RolesEnum.SECRETARY,
        tenantId: DEFAULT_TENANT_ID,
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          email: 'ana@example.com',
          name: 'Ana Souza',
          role: RolesEnum.SECRETARY,
          tenantId: DEFAULT_TENANT_ID,
        });
        expect(body.cpf).toBe('390.***.***.05');
      });

    expect(createUseCase.execute).toHaveBeenCalledWith({
      email: 'ana@example.com',
      password: 'SenhaForte123!',
      name: 'Ana Souza',
      cpf: '39053344705',
      phone: '11999990000',
      role: RolesEnum.SECRETARY,
      tenantId: DEFAULT_TENANT_ID,
    });
  });

  it('lista usu�rios aplicando fallback de tenant e formato do presenter', async () => {
    const user = buildUser();
    findAllUseCase.execute.mockResolvedValue({
      data: {
        data: [user],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
    });

    await request(app.getHttpServer())
      .get('/users?limit=20')
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toHaveLength(1);
        expect(body.data[0]).toMatchObject({
          email: 'ana@example.com',
          name: 'Ana Souza',
          role: RolesEnum.SECRETARY,
          tenantId: DEFAULT_TENANT_ID,
        });
        expect(body.data[0].cpf).toBe('390.***.***.05');
        expect(body.pagination).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
      });

    const listCallArgs = findAllUseCase.execute.mock.calls[0][0];
    expect(listCallArgs.limit).toBe(20);
    expect(listCallArgs.page).toBeUndefined();
    expect(listCallArgs.role).toBeUndefined();
    expect(listCallArgs.tenantId).toBe(DEFAULT_TENANT_ID);
    expect(listCallArgs.isActive).toBeUndefined();
  });

  it('mant�m tenant informado quando recebido no filtro', async () => {
    findAllUseCase.execute.mockResolvedValue({
      data: {
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      },
    });

    await request(app.getHttpServer())
      .get('/users?tenantId=550e8400-e29b-41d4-a716-446655440000&limit=10')
      .expect(200);

    const explicitCallArgs = findAllUseCase.execute.mock.calls[0][0];
    expect(explicitCallArgs.limit).toBe(10);
    expect(explicitCallArgs.page).toBeUndefined();
    expect(explicitCallArgs.role).toBeUndefined();
    expect(explicitCallArgs.tenantId).toBe(DEFAULT_TENANT_ID);
    expect(explicitCallArgs.isActive).toBeUndefined();
  });

  it('recupera usu�rio por slug delegando ao use case', async () => {
    const user = buildUser();
    findBySlugUseCase.execute.mockResolvedValue({ data: user });

    await request(app.getHttpServer())
      .get('/users/ana-souza')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          email: 'ana@example.com',
          name: 'Ana Souza',
          slug: 'ana-souza',
        });
        expect(body.cpf).toBe('390.***.***.05');
      });

    expect(findBySlugUseCase.execute).toHaveBeenCalledWith('ana-souza');
  });

  it('propaga erro 404 quando usu�rio n�o encontrado', async () => {
    findBySlugUseCase.execute.mockResolvedValue({
      error: new NotFoundException('Usu�rio n�o encontrado'),
    });

    await request(app.getHttpServer()).get('/users/desconhecido').expect(404);
  });

  it('atualiza usu�rio convertendo input para contrato de dom�nio', async () => {
    const updatedUser = buildUser({ name: 'Ana Atualizada' });
    updateUseCase.execute.mockResolvedValue({ data: updatedUser });
    currentUser.metadata = { slug: 'ana-souza' };

    await request(app.getHttpServer())
      .patch('/users/ana-souza')
      .send({
        name: 'Ana Atualizada',
        metadata: { locale: 'pt-BR' },
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.name).toBe('Ana Atualizada');
        expect(body.email).toBe('ana@example.com');
        expect(body.cpf).toBe('390.***.***.05');
      });

    expect(updateUseCase.execute).toHaveBeenCalledWith(
      'ana-souza',
      {
        name: 'Ana Atualizada',
        metadata: { locale: 'pt-BR' },
        phone: undefined,
        isActive: undefined,
      },
      currentUser.id,
    );
  });

  it('deleta usu�rio via use case mantendo contexto', async () => {
    deleteUseCase.execute.mockResolvedValue({ data: undefined });

    await request(app.getHttpServer()).delete('/users/ana-souza').expect(204);

    expect(deleteUseCase.execute).toHaveBeenCalledWith('ana-souza', currentUser.id);
  });

  it('bloqueia cria��o com payload inv�lido retornando 400', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({ email: 'invalido', password: '123', cpf: '999' })
      .expect(400);

    expect(createUseCase.execute).not.toHaveBeenCalled();
  });
});
