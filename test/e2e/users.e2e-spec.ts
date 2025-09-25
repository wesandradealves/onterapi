import { ExecutionContext, INestApplication, NotFoundException, Injectable } from '@nestjs/common';
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
  IFindUserBySlugUseCase,
  FindUserBySlugUseCaseToken,
} from '@domain/users/interfaces/use-cases/find-user-by-slug.use-case.interface';
import { IUpdateUserUseCase } from '@domain/users/interfaces/use-cases/update-user.use-case.interface';
import { IDeleteUserUseCase } from '@domain/users/interfaces/use-cases/delete-user.use-case.interface';
import { CreateUserCommand, IUpdateUser, IUserFilters } from '@domain/users/types/user.types';
import { UserEntity } from '@infrastructure/auth/entities/user.entity';
import { success, failure, Result } from '@shared/types/result.type';

const DEFAULT_TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';

@Injectable()
class InMemoryUsersStore {
  private users: UserEntity[] = [];

  constructor(seed: UserEntity[] = []) {
    this.users = [...seed];
  }

  public create(command: CreateUserCommand): UserEntity {
    const now = new Date();
    const baseSlug = this.slugify(command.name);
    const slug = this.ensureUniqueSlug(baseSlug);

    const user: UserEntity = {
      id: `user-${this.users.length + 1}`,
      supabaseId: `supabase-${this.users.length + 1}`,
      slug,
      email: command.email,
      name: command.name,
      cpf: command.cpf,
      phone: command.phone,
      role: command.role,
      roleInternal: command.role.toLowerCase(),
      tenantId: command.tenantId ?? DEFAULT_TENANT_ID,
      twoFactorEnabled: false,
      isActive: true,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: undefined,
      password_hash: undefined,
      twoFactorSecret: undefined,
      backupCodes: undefined,
      emailVerificationToken: undefined,
      emailVerificationSentAt: undefined,
      emailVerifiedAt: undefined,
      failedLoginAttempts: 0,
      lockedUntil: undefined,
      metadata: { slug, tenantId: command.tenantId },
      deletedAt: undefined,
      sessions: [],
      permissions: [],
    } as unknown as UserEntity;

    this.users.push(user);
    return user;
  }

  public list(filters: IUserFilters = {}): { data: UserEntity[]; total: number } {
    let collection = [...this.users];

    if (filters.role) {
      collection = collection.filter((user) => user.role === filters.role);
    }
    if (filters.tenantId) {
      collection = collection.filter((user) => user.tenantId === filters.tenantId);
    }
    if (typeof filters.isActive === 'boolean') {
      collection = collection.filter((user) => user.isActive === filters.isActive);
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const start = (page - 1) * limit;
    const data = collection.slice(start, start + limit);

    return { data, total: collection.length };
  }

  public findBySlug(slug: string): UserEntity | undefined {
    return this.users.find((user) => user.slug === slug);
  }

  public update(slug: string, data: IUpdateUser): UserEntity {
    const user = this.findBySlug(slug);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (data.name) {
      user.name = data.name;
    }
    if (data.phone !== undefined) {
      user.phone = data.phone;
    }
    if (data.isActive !== undefined) {
      user.isActive = data.isActive;
    }
    if (data.metadata) {
      user.metadata = { ...(user.metadata ?? {}), ...data.metadata };
    }
    user.updatedAt = new Date();
    return user;
  }

  public delete(slug: string): void {
    this.users = this.users.filter((user) => user.slug !== slug);
  }

  private ensureUniqueSlug(baseSlug: string): string {
    let slug = baseSlug;
    let counter = 1;
    while (this.users.some((user) => user.slug === slug)) {
      slug = `${baseSlug}-${++counter}`;
    }
    return slug;
  }

  private slugify(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_-]+/g, '-')
      .toLowerCase();
  }
}

@Injectable()
class InMemoryCreateUserUseCase implements ICreateUserUseCase {
  constructor(private readonly store: InMemoryUsersStore) {}

  async execute(dto: CreateUserCommand): Promise<Result<UserEntity>> {
    return success(this.store.create(dto));
  }
}

@Injectable()
class InMemoryFindAllUsersUseCase implements IFindAllUsersUseCase {
  constructor(private readonly store: InMemoryUsersStore) {}

  async execute(filters: IUserFilters): Promise<Result<{ data: UserEntity[]; pagination: any }>> {
    const { data, total } = this.store.list(filters);
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const totalPages = Math.ceil(total / limit) || 1;

    return success({
      data,
      pagination: { page, limit, total, totalPages },
    });
  }
}

@Injectable()
class InMemoryFindUserBySlugUseCase implements IFindUserBySlugUseCase {
  constructor(private readonly store: InMemoryUsersStore) {}

  async execute(slug: string): Promise<Result<UserEntity>> {
    const user = this.store.findBySlug(slug);
    if (!user) {
      return failure(new NotFoundException('Usuário não encontrado'));
    }
    return success(user);
  }
}

@Injectable()
class InMemoryUpdateUserUseCase implements IUpdateUserUseCase {
  constructor(private readonly store: InMemoryUsersStore) {}

  async execute(slug: string, dto: IUpdateUser): Promise<Result<UserEntity>> {
    return success(this.store.update(slug, dto));
  }
}

@Injectable()
class InMemoryDeleteUserUseCase implements IDeleteUserUseCase {
  constructor(private readonly store: InMemoryUsersStore) {}

  async execute(slug: string): Promise<Result<void>> {
    this.store.delete(slug);
    return success(undefined);
  }
}

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let store: InMemoryUsersStore;

  const seededUser: UserEntity = {
    id: 'user-seed',
    supabaseId: 'supabase-seed',
    slug: 'joao-silva',
    email: 'joao@clinic.com',
    name: 'João Silva',
    cpf: '52998224725',
    phone: '11999990000',
    role: RolesEnum.PROFESSIONAL,
    roleInternal: RolesEnum.PROFESSIONAL.toLowerCase(),
    tenantId: DEFAULT_TENANT_ID,
    twoFactorEnabled: false,
    isActive: true,
    emailVerified: true,
    createdAt: new Date('2025-01-01T10:00:00.000Z'),
    updatedAt: new Date('2025-01-01T10:00:00.000Z'),
    lastLoginAt: undefined,
    password_hash: undefined,
    twoFactorSecret: undefined,
    backupCodes: undefined,
    emailVerificationToken: undefined,
    emailVerificationSentAt: undefined,
    emailVerifiedAt: new Date('2025-01-10T10:00:00.000Z'),
    failedLoginAttempts: 0,
    lockedUntil: undefined,
    metadata: { slug: 'joao-silva' },
    deletedAt: undefined,
    sessions: [],
    permissions: [],
  } as unknown as UserEntity;

  const currentUser: ICurrentUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    name: 'Admin',
    role: RolesEnum.SUPER_ADMIN,
    tenantId: DEFAULT_TENANT_ID,
    sessionId: 'session-1',
    metadata: { slug: 'admin' },
  } as ICurrentUser;

  beforeAll(async () => {
    store = new InMemoryUsersStore([seededUser]);

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: 'ICreateUserUseCase', useClass: InMemoryCreateUserUseCase },
        { provide: 'IFindAllUsersUseCase', useClass: InMemoryFindAllUsersUseCase },
        { provide: FindUserBySlugUseCaseToken, useClass: InMemoryFindUserBySlugUseCase },
        { provide: 'IUpdateUserUseCase', useClass: InMemoryUpdateUserUseCase },
        { provide: 'IDeleteUserUseCase', useClass: InMemoryDeleteUserUseCase },
        { provide: InMemoryUsersStore, useValue: store },
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

  it('lista usuários existentes com paginação padrão', async () => {
    await request(app.getHttpServer())
      .get('/users')
      .expect(200)
      .expect(({ body }) => {
        expect(body.pagination.total).toBe(1);
        expect(body.data[0].slug).toBe('joao-silva');
      });
  });

  it('cria, atualiza e remove um usuário mantendo cobertura do fluxo completo', async () => {
    // Create
    const createResponse = await request(app.getHttpServer())
      .post('/users')
      .send({
        email: 'ana@example.com',
        password: 'SenhaForte123!',
        name: 'Ana Souza',
        cpf: '39053344705',
        phone: '11988887777',
        role: RolesEnum.SECRETARY,
        tenantId: DEFAULT_TENANT_ID,
      })
      .expect(201);

    expect(createResponse.body.slug).toBeDefined();

    const slug = createResponse.body.slug;

    // Check details
    await request(app.getHttpServer())
      .get(`/users/${slug}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.email).toBe('ana@example.com');
        expect(body.cpf).toBe('390.***.***.05');
      });

    // Update
    await request(app.getHttpServer())
      .patch(`/users/${slug}`)
      .send({ name: 'Ana Atualizada', metadata: { locale: 'pt-BR' } })
      .expect(200)
      .expect(({ body }) => {
        expect(body.name).toBe('Ana Atualizada');
        expect(body).not.toHaveProperty('metadata');
      });

    // Delete
    await request(app.getHttpServer()).delete(`/users/${slug}`).expect(204);

    await request(app.getHttpServer()).get(`/users/${slug}`).expect(404);
  });
});



















