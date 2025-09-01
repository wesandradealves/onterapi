import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  ISupabaseAuthService,
  SignUpData,
  SupabaseUser,
  SupabaseSession,
} from '@domain/auth/interfaces/services/supabase-auth.service.interface';
import { Result } from '@shared/types/result.type';

@Injectable()
export class SupabaseAuthService implements ISupabaseAuthService {
  private readonly logger = new Logger(SupabaseAuthService.name);
  private readonly supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration is missing');
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

  async signOut(accessToken: string): Promise<Result<void>> {
    try {
      const { error } = await this.supabase.auth.admin.signOut(accessToken);

      if (error) {
        this.logger.error(`Supabase signOut error: ${error.message}`);
        return { error: new Error(error.message) };
      }

      return { data: undefined };
    } catch (error) {
      this.logger.error('Unexpected error in signOut', error);
      return { error: error as Error };
    }
  }

  async verifyEmail(token: string): Promise<Result<void>> {
    try {
      const { error } = await this.supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email',
      });

      if (error) {
        this.logger.error(`Supabase verifyEmail error: ${error.message}`);
        return { error: new Error(error.message) };
      }

      return { data: undefined };
    } catch (error) {
      this.logger.error('Unexpected error in verifyEmail', error);
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
      const { error } = await this.supabase.auth.updateUser(
        { password: newPassword },
        { accessToken }
      );

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
      const { data: userData, error } = await this.supabase.auth.admin.updateUserById(
        userId,
        { user_metadata: metadata }
      );

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
}