import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuthErrorFactory } from '../../../shared/factories/auth-error.factory';
import {
  ISupabaseAuthService,
  SignUpData,
  SupabaseGeneratedLink,
  SupabaseGenerateLinkOptions,
  SupabaseSession,
  SupabaseUser,
} from '../../../domain/auth/interfaces/services/supabase-auth.service.interface';
import { Result } from '../../../shared/types/result.type';

type SupabaseAuthUserRecord = {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  createdAt?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
  last_sign_in_at?: string | null;
  user?: SupabaseAuthUserRecord | null;
};

@Injectable()
export class SupabaseAuthService implements ISupabaseAuthService {
  private readonly logger = new Logger(SupabaseAuthService.name);
  private readonly supabase: SupabaseClient;
  private readonly appUrl: string;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw AuthErrorFactory.internalServerError('Supabase configuration is missing');
    }

    this.appUrl = this.configService.get<string>('APP_URL') ?? 'http://localhost:3000';

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
        redirectTo: `${this.appUrl}/auth/confirm`,
      });

      if (inviteError) {
        this.logger.error(`Error sending verification email: ${inviteError.message}`);
      } else {
        this.logger.log(`Verification email sent via Supabase to ${data.email}`);
      }

      return { data: this.mapUserRecord(authData.user) };
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

      const sessionUser = this.mapUserRecord(authData.user);

      const session: SupabaseSession = {
        accessToken: authData.session.access_token,
        refreshToken: authData.session.refresh_token,
        expiresIn: authData.session.expires_in || 3600,
        user: sessionUser,
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
          this.logger.debug('Supabase signOut token was not accepted by Supabase, ignoring', {
            userId,
            reason: message,
          });
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

  async getUserById(userId: string): Promise<Result<SupabaseUser>> {
    try {
      const { data, error } = await this.supabase.auth.admin.getUserById(userId);

      if (error) {
        this.logger.error(`Supabase getUserById error: ${error.message}`);
        return { error: new Error(error.message) };
      }

      if (!data || !data.user) {
        return { error: new Error('User not found') };
      }

      return { data: this.mapUserRecord(data.user) };
    } catch (error) {
      this.logger.error('Unexpected error in getUserById', error);
      return { error: error as Error };
    }
  }

  async generateVerificationLink(
    email: string,
    options?: SupabaseGenerateLinkOptions,
  ): Promise<Result<SupabaseGeneratedLink>> {
    try {
      const redirectTo = options?.redirectTo ?? `${this.appUrl}/auth/confirm`;
      const { data, error } = await this.supabase.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: {
          redirectTo,
        },
      });

      if (error) {
        this.logger.error(`Supabase generateVerificationLink error: ${error.message}`);
        return { error: new Error(error.message) };
      }

      const properties = (data?.properties ?? null) as Record<string, unknown> | null;

      if (!properties) {
        return { error: new Error('Supabase did not return link properties') };
      }

      const link = this.mapGeneratedLink(properties, redirectTo);

      return { data: link };
    } catch (error) {
      this.logger.error('Unexpected error in generateVerificationLink', error);
      return { error: error as Error };
    }
  }

  async generatePasswordResetLink(
    email: string,
    options?: SupabaseGenerateLinkOptions,
  ): Promise<Result<SupabaseGeneratedLink>> {
    try {
      const redirectTo = options?.redirectTo ?? `${this.appUrl}/reset-password`;
      const { data, error } = await this.supabase.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
          redirectTo,
        },
      });

      if (error) {
        this.logger.error(`Supabase generatePasswordResetLink error: ${error.message}`);
        return { error: new Error(error.message) };
      }

      const properties = (data?.properties ?? null) as Record<string, unknown> | null;

      if (!properties) {
        return { error: new Error('Supabase did not return link properties') };
      }

      const link = this.mapGeneratedLink(properties, redirectTo);

      return { data: link };
    } catch (error) {
      this.logger.error('Unexpected error in generatePasswordResetLink', error);
      return { error: error as Error };
    }
  }

  async resetPassword(email: string): Promise<Result<void>> {
    try {
      const resetUrl = `${this.appUrl}/reset-password`;

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

  async updatePassword(
    accessToken: string,
    newPassword: string,
    _refreshToken?: string,
  ): Promise<Result<void>> {
    try {
      if (!accessToken) {
        this.logger.error('Supabase updatePassword called without access token');
        return { error: new Error('Access token is required to update password') };
      }

      const { data: userData, error: fetchError } = await this.supabase.auth.getUser(accessToken);

      if (fetchError) {
        this.logger.error(`Supabase getUser error: ${fetchError.message}`);
        return { error: new Error(fetchError.message) };
      }

      const userId = userData.user?.id;

      if (!userId) {
        return { error: new Error('User not found for password update') };
      }

      const { error } = await this.supabase.auth.admin.updateUserById(userId, {
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

      return { data: this.mapUserRecord(userData.user) };
    } catch (error) {
      this.logger.error('Unexpected error in getUser', error);
      return { error: error as Error };
    }
  }

  async updateUserMetadata(
    userId: string,
    metadata: Record<string, unknown>,
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

      return { data: this.mapUserRecord(userData.user) };
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

      const sessionUser = this.mapUserRecord(authData.user);

      const session: SupabaseSession = {
        accessToken: authData.session.access_token,
        refreshToken: authData.session.refresh_token,
        expiresIn: authData.session.expires_in || 3600,
        user: sessionUser,
      };

      return { data: session };
    } catch (error) {
      this.logger.error('Unexpected error in refreshToken', error);
      return { error: error as Error };
    }
  }

  private mapGeneratedLink(
    properties: Record<string, unknown> | null | undefined,
    fallbackRedirect: string,
  ): SupabaseGeneratedLink {
    const record = (properties ?? {}) as Record<string, unknown>;
    const actionLinkRaw = record['action_link'];
    const actionLink = typeof actionLinkRaw === 'string' ? actionLinkRaw : '';

    if (!actionLink) {
      throw new Error('Supabase did not return an action link');
    }

    const redirectToValue = record['redirect_to'];
    const redirectTo =
      typeof redirectToValue === 'string' && redirectToValue.trim().length > 0
        ? redirectToValue
        : fallbackRedirect;

    const link: SupabaseGeneratedLink = {
      actionLink,
      redirectTo,
    };

    const emailOtp = record['email_otp'];
    if (typeof emailOtp === 'string' && emailOtp.trim().length > 0) {
      link.emailOtp = emailOtp;
    }

    const hashedToken = record['hashed_token'];
    if (typeof hashedToken === 'string' && hashedToken.trim().length > 0) {
      link.hashedToken = hashedToken;
    }

    const verificationType = record['verification_type'];
    if (typeof verificationType === 'string' && verificationType.trim().length > 0) {
      link.verificationType = verificationType;
    }

    return link;
  }

  private mapUserRecord(data: SupabaseAuthUserRecord | null | undefined): SupabaseUser {
    const source = (data?.user ?? data) as SupabaseAuthUserRecord | null;

    if (!source || !source.id) {
      throw new Error('Supabase user payload is invalid');
    }

    const createdAt = source.created_at ?? source.createdAt ?? new Date().toISOString();
    const updatedAt = source.updated_at ?? source.updatedAt ?? createdAt;
    const metadata = (source.user_metadata ?? source.metadata ?? {}) as Record<string, unknown>;

    return {
      id: source.id,
      email: source.email ?? '',
      emailVerified: !!source.email_confirmed_at,
      metadata,
      createdAt: new Date(createdAt),
      updatedAt: new Date(updatedAt),
    };
  }

  async listUsers(params: {
    page?: number;
    perPage?: number;
  }): Promise<Result<{ users: SupabaseUser[] }>> {
    try {
      const { data, error } = await this.supabase.auth.admin.listUsers({
        page: params.page || 1,
        perPage: params.perPage || 20,
      });

      if (error) {
        this.logger.error(`Supabase listUsers error: ${error.message}`);
        return { error: new Error(error.message) };
      }

      const users = (data?.users ?? []).map((user) =>
        this.mapUserRecord(user as SupabaseAuthUserRecord),
      );

      return { data: { users } };
    } catch (error) {
      this.logger.error('Unexpected error in listUsers', error);
      return { error: error as Error };
    }
  }

  async deleteUser(userId: string): Promise<Result<void>> {
    try {
      const { error } = await this.supabase.auth.admin.deleteUser(userId);

      if (error) {
        const message = error.message || 'Supabase deleteUser failed';
        const normalized = message.toLowerCase();

        if (normalized.includes('user not found')) {
          this.logger.debug(
            `Supabase deleteUser: user already absent in auth provider (${userId})`,
          );
          return { data: undefined };
        }

        this.logger.error(`Supabase deleteUser error: ${message} (userId: ${userId})`);
        return { error: new Error(message) };
      }

      return { data: undefined };
    } catch (error) {
      this.logger.error('Unexpected error in deleteUser', error);
      return { error: error as Error };
    }
  }
}
