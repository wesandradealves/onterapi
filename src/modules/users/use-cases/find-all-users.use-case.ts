import { Injectable, Logger, Inject } from '@nestjs/common';
import { IFindAllUsersUseCase } from '../../../domain/users/interfaces/use-cases/find-all-users.use-case.interface';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { UserEntity } from '../../../infrastructure/auth/entities/user.entity';
import { ListUsersDto } from '../api/dtos/list-users.dto';

@Injectable()
export class FindAllUsersUseCase implements IFindAllUsersUseCase {
  private readonly logger = new Logger(FindAllUsersUseCase.name);
  private readonly supabase;

  constructor(
    private readonly configService: ConfigService,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    this.supabase = createClient(supabaseUrl!, supabaseKey!);
  }

  async execute(filters: ListUsersDto): Promise<{
    data: UserEntity[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;

      const { data: users, error } = await this.supabase.auth.admin.listUsers({
        page,
        perPage: limit,
      });

      if (error) {
        throw error;
      }

      let filteredUsers = users.users || [];
      
      if (filters.role) {
        filteredUsers = filteredUsers.filter(u => u.user_metadata?.role === filters.role);
      }
      
      if (filters.tenantId) {
        filteredUsers = filteredUsers.filter(u => u.user_metadata?.tenantId === filters.tenantId);
      }
      
      if (filters.isActive !== undefined) {
        filteredUsers = filteredUsers.filter(u => !(u as any).banned_until === filters.isActive);
      }

      const mappedUsers = filteredUsers.map(user => {
        const metadata = user.user_metadata || {};
        return {
          id: user.id,
          email: user.email || '',
          name: metadata.name || '',
          cpf: metadata.cpf || '',
          phone: metadata.phone || '',
          role: metadata.role || 'PATIENT',
          tenantId: metadata.tenantId || null,
          isActive: !(user as any).banned_until,
          emailVerified: !!user.email_confirmed_at,
          twoFactorEnabled: metadata.twoFactorEnabled || false,
          lastLoginAt: user.last_sign_in_at ? new Date(user.last_sign_in_at) : null,
          createdAt: new Date(user.created_at),
          updatedAt: new Date(user.updated_at || user.created_at),
        } as UserEntity;
      });

      const total = mappedUsers.length;
      const totalPages = Math.ceil(total / limit);

      this.logger.log(`Listando ${mappedUsers.length} usuários de ${total} total`);

      return {
        data: mappedUsers,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      this.logger.error('Erro ao listar usuários', error);
      throw error;
    }
  }
}