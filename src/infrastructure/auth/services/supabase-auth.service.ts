import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuthErrorFactory } from '../../../shared/factories/auth-error.factory';
import {
  ISupabaseAuthService,
  SignUpData,
  SupabaseSession,
  SupabaseUser,
} from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { Result } from '../../../shared/types/result.type';

@Injectable()
export class SupabaseAuthService implements ISupabaseAuthService {
  private readonly logger = new Logger(SupabaseAuthService.name);
  private readonly supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw AuthErrorFactory.internalServerError('Supabase configuration is missing');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async signUp(data: SignUpData): Promise<Result<SupabaseUser>> {
    try {
      const { data: authData, error } = await this.supabase.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: false,
        user_metadata: data.metadata || {},
      });

      if (error) {
        this.logger.error(`Supabase signUp error: ${error.message}`);
        return { error: new Error(error.message) };
      }

      if (!authData.user) {
        return { error: new Error('Failed to create user') };
      }

      const { error: inviteError } = await this.supabase.auth.admin.inviteUserByEmail(data.email, {
        redirectTo: `${this.configService.get<string>('APP_URL')}/auth/confirm`,
      });

      if (inviteError) {
        this.logger.error(`Error sending verification email: ${inviteError.message}`);
      } else {
        this.logger.log(`Verification email sent via Supabase to ${data.email}`);
      }

      const user: SupabaseUser = {
        id: authData.user.id,
        email: authData.user.email!,
        emailVerified: !!authData.user.email_confirmed_at,
        metadata: authData.user.user_metadata || {},
        createdAt: new Date(authData.user.created_at),
        updatedAt: new Date(authData.user.updated_at || authData.user.created_at),
      };

      return { data: user };
    } catch (error) {
      this.logger.error('Unexpected error in signUp', error);
      return { error: error as Error };
    }
  }

  async signIn(email: string, password: string): Promise<Result<SupabaseSession>> {
    try {
      const { data: authData, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        this.logger.error(`Supabase signIn error: ${error.message}`);
        return { error: new Error(error.message) };
      }

      if (!authData.user || !authData.session) {
        return { error: new Error('Invalid credentials') };
      }

      const session: SupabaseSession = {
        accessToken: authData.session.access_token,
        refreshToken: authData.session.refresh_token,
        expiresIn: authData.session.expires_in || 3600,
        user: {
          id: authData.user.id,
          email: authData.user.email!,
          emailVerified: !!authData.user.email_confirmed_at,
          metadata: authData.user.user_metadata || {},
          createdAt: new Date(authData.user.created_at),
          updatedAt: new Date(authData.user.updated_at || authData.user.created_at),
        },
      };

      return { data: session };
    } catch (error) {
      this.logger.error('Unexpected error in signIn', error);
      return { error: error as Error };
    }
  }

  async signOut(accessToken: string, userId?: string): Promise<Result<void>> {
    try {
      if (!accessToken) {
        this.logger.debug('No Supabase access token provided for signOut', { userId });
        return { data: undefined };
      }

      const { error } = await this.supabase.auth.admin.signOut(accessToken);

      if (error) {
        const message = error.message || 'Supabase signOut failed';

        if (message.toLowerCase().includes('invalid jwt')) {
          this.logger.debug('Supabase signOut token was not accepted by Supabase, ignoring', { userId, reason: message });
          return { data: undefined };
        }

        this.logger.error('Supabase signOut error: ' + message);
        return { error: new Error(message) };
      }

      return { data: undefined };
    } catch (error) {
      this.logger.error('Unexpected error in signOut', error);
      return { error: error as Error };
    }
  }

  async verifyEmail(token: string, email?: string): Promise<Result<void>> {
    try {
      if (!token || token.length < 6) {
        return { error: new Error('Token invÃ¡lido') };
      }

      if (token.includes('test-token') || token === '123456') {
        return { error: new Error('Token de teste nÃ£o Ã© vÃ¡lido') };
      }

      if (email) {
        try {
          const { data: tokenData, error: tokenError } = await this.supabase
            .from('email_verification_tokens')
            .select('*')
            .eq('token', token)
            .eq('email', email)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .single();

          if (tokenError || !tokenData) {
            return { error: new Error('Token invÃ¡lido ou expirado') };
          }

          await this.supabase
            .from('email_verification_tokens')
            .update({ used: true, updated_at: new Date().toISOString() })
            .eq('id', tokenData.id);

          this.logger.log(`Email verificado com sucesso para: ${email}`);
          return { data: undefined };
        } catch (dbError) {
          this.logger.error('Erro ao verificar token no banco:', dbError);

          const { data, error } = await this.supabase.auth.verifyOtp({
            type: 'email',
            token: token,
            email: email,
          });

          if (error) {
            this.logger.error(`Erro ao verificar token OTP: ${error.message}`);
            return { error: new Error('Token invÃ¡lido ou expirado') };
          }

          if (!data.user) {
            return { error: new Error('Token invÃ¡lido') };
          }

          this.logger.log(`Email verificado com sucesso para usuÃ¡rio: ${data.user.email}`);
          return { data: undefined };
        }
      }

      const tokenRegex = /^[a-f0-9]{64}$/;
      if (!tokenRegex.test(token)) {
        return { error: new Error('Formato de token invÃ¡lido') };
      }

      return { error: new Error('Email Ã© necessÃ¡rio para validaÃ§Ã£o completa') };
    } catch (error) {
      this.logger.error('Erro inesperado ao verificar email', error);
      return { error: error as Error };
    }
  }

  async confirmEmailByEmail(email: string): Promise<Result<void>> {
    try {
      const {
        data: { users },
        error: listError,
      } = await this.supabase.auth.admin.listUsers();

      if (listError) {
        this.logger.error(`Erro ao listar usuÃ¡rios: ${listError.message}`);
        return { error: new Error('Erro ao buscar usuÃ¡rio') };
      }

      const user = users.find((u) => u.email === email);

      if (!user) {
        return { error: new Error('UsuÃ¡rio nÃ£o encontrado') };
      }

      if (user.email_confirmed_at) {
        this.logger.warn(`Email jÃ¡ confirmado para: ${email}`);
        return { error: new Error('Email jÃ¡ foi confirmado anteriormente') };
      }

      const { error } = await this.supabase.auth.admin.updateUserById(user.id, {
        email_confirm: true,
      });

      if (error) {
        this.logger.error(`Erro ao confirmar email: ${error.message}`);
        return { error: new Error('Erro ao confirmar email') };
      }

      this.logger.log(`Email confirmado com sucesso para: ${email}`);
      return { data: undefined };
    } catch (error) {
      this.logger.error('Erro inesperado ao confirmar email', error);
      return { error: error as Error };
    }
  }

  async getUserById(userId: string): Promise<Result<any>> {
    try {
      const { data, error } = await this.supabase.auth.admin.getUserById(userId);

      if (error) {
        this.logger.error(`Supabase getUserById error: ${error.message}`);
        return { error: new Error(error.message) };
      }

      if (!data || !data.user) {
        return { error: new Error('User not found') };
      }

      return { data: data.user };
    } catch (error) {
      this.logger.error('Unexpected error in getUserById', error);
      return { error: error as Error };
    }
  }

  async resetPassword(email: string): Promise<Result<void>> {
    try {
      const resetUrl = `${this.configService.get<string>('APP_URL')}/reset-password`;

      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetUrl,
      });

      if (error) {
        this.logger.error(`Supabase resetPassword error: ${error.message}`);
        return { error: new Error(error.message) };
      }

      return { data: undefined };
    } catch (error) {
      this.logger.error('Unexpected error in resetPassword', error);
      return { error: error as Error };
    }
  }

  async updatePassword(accessToken: string, newPassword: string): Promise<Result<void>> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        this.logger.error(`Supabase updatePassword error: ${error.message}`);
        return { error: new Error(error.message) };
      }

      return { data: undefined };
    } catch (error) {
      this.logger.error('Unexpected error in updatePassword', error);
      return { error: error as Error };
    }
  }

  async getUser(accessToken: string): Promise<Result<SupabaseUser>> {
    try {
      const { data: userData, error } = await this.supabase.auth.getUser(accessToken);

      if (error) {
        this.logger.error(`Supabase getUser error: ${error.message}`);
        return { error: new Error(error.message) };
      }

      if (!userData.user) {
        return { error: new Error('User not found') };
      }

      const user: SupabaseUser = {
        id: userData.user.id,
        email: userData.user.email!,
        emailVerified: !!userData.user.email_confirmed_at,
        metadata: userData.user.user_metadata || {},
        createdAt: new Date(userData.user.created_at),
        updatedAt: new Date(userData.user.updated_at || userData.user.created_at),
      };

      return { data: user };
    } catch (error) {
      this.logger.error('Unexpected error in getUser', error);
      return { error: error as Error };
    }
  }

  async updateUserMetadata(
    userId: string,
    metadata: Record<string, any>,
  ): Promise<Result<SupabaseUser>> {
    try {
      const { data: userData, error } = await this.supabase.auth.admin.updateUserById(userId, {
        user_metadata: metadata,
      });

      if (error) {
        this.logger.error(`Supabase updateUserMetadata error: ${error.message}`);
        return { error: new Error(error.message) };
      }

      if (!userData.user) {
        return { error: new Error('Failed to update user') };
      }

      const user: SupabaseUser = {
        id: userData.user.id,
        email: userData.user.email!,
        emailVerified: !!userData.user.email_confirmed_at,
        metadata: userData.user.user_metadata || {},
        createdAt: new Date(userData.user.created_at),
        updatedAt: new Date(userData.user.updated_at || userData.user.created_at),
      };

      return { data: user };
    } catch (error) {
      this.logger.error('Unexpected error in updateUserMetadata', error);
      return { error: error as Error };
    }
  }

  async refreshToken(refreshToken: string): Promise<Result<SupabaseSession>> {
    try {
      const { data: authData, error } = await this.supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error) {
        this.logger.error(`Supabase refreshToken error: ${error.message}`);
        return { error: new Error(error.message) };
      }

      if (!authData.user || !authData.session) {
        return { error: new Error('Invalid refresh token') };
      }

      const session: SupabaseSession = {
        accessToken: authData.session.access_token,
        refreshToken: authData.session.refresh_token,
        expiresIn: authData.session.expires_in || 3600,
        user: {
          id: authData.user.id,
          email: authData.user.email!,
          emailVerified: !!authData.user.email_confirmed_at,
          metadata: authData.user.user_metadata || {},
          createdAt: new Date(authData.user.created_at),
          updatedAt: new Date(authData.user.updated_at || authData.user.created_at),
        },
      };

      return { data: session };
    } catch (error) {
      this.logger.error('Unexpected error in refreshToken', error);
      return { error: error as Error };
    }
  }

  async listUsers(params: { page?: number; perPage?: number }): Promise<Result<{ users: any[] }>> {
    try {
      const { data, error } = await this.supabase.auth.admin.listUsers({
        page: params.page || 1,
        perPage: params.perPage || 20,
      });

      if (error) {
        this.logger.error(`Supabase listUsers error: ${error.message}`);
        return { error: new Error(error.message) };
      }

      return { data: { users: data?.users || [] } };
    } catch (error) {
      this.logger.error('Unexpected error in listUsers', error);
      return { error: error as Error };
    }
  }

  async deleteUser(userId: string): Promise<Result<void>> {
    try {
      const { error } = await this.supabase.auth.admin.deleteUser(userId);

      if (error) {
        this.logger.error(`Supabase deleteUser error: ${error.message}`);
        return { error: new Error(error.message) };
      }

      return { data: undefined };
    } catch (error) {
      this.logger.error('Unexpected error in deleteUser', error);
      return { error: error as Error };
    }
  }
}

