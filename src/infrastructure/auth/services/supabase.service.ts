import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuthErrorFactory } from '../../../shared/factories/auth-error.factory';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw AuthErrorFactory.internalServerError('Supabase credentials not configured');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async createUser(email: string, password: string, metadata?: Record<string, unknown>) {
    const { data, error } = await this.supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: metadata || {},
    });

    if (error) {
      this.logger.error(`Error creating user in Supabase: ${error.message}`);
    }

    return { user: data?.user, error };
  }

  async updateUser(supabaseId: string, data: { email?: string; password?: string }) {
    const { data: user, error } = await this.supabase.auth.admin.updateUserById(supabaseId, data);

    if (error) {
      this.logger.error(`Error updating user in Supabase: ${error.message}`);
    }

    return { user, error };
  }

  async deleteUser(supabaseId: string) {
    const { error } = await this.supabase.auth.admin.deleteUser(supabaseId);

    if (error) {
      this.logger.error(`Error deleting user in Supabase: ${error.message}`);
    }

    return { error };
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { session: data?.session, user: data?.user, error };
  }

  async signOut(token: string) {
    const { error } = await this.supabase.auth.admin.signOut(token);
    return { error };
  }

  async verifyEmail(token: string) {
    const { data, error } = await this.supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email',
    });

    return { data, error };
  }

  async resetPassword(email: string) {
    const { data, error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${this.configService.get<string>('APP_URL')}/reset-password`,
    });

    return { data, error };
  }

  async updatePassword(token: string, password: string) {
    const { data, error } = await this.supabase.auth.updateUser({
      password,
    });

    return { data, error };
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }
}
