import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { extname } from 'path';

import {
  DeleteAnamnesisAttachmentInput,
  IAnamnesisAttachmentStorageService,
  UploadAnamnesisAttachmentInput,
  UploadAnamnesisAttachmentResult,
} from '../../../domain/anamnesis/interfaces/services/anamnesis-attachment-storage.service.interface';
import { SupabaseService } from '../../auth/services/supabase.service';
import { slugify } from '../../../shared/utils/slug.util';

@Injectable()
export class SupabaseAnamnesisAttachmentStorageService
  implements IAnamnesisAttachmentStorageService
{
  private readonly logger = new Logger(SupabaseAnamnesisAttachmentStorageService.name);
  private readonly bucket: string;
  private readonly basePath: string;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    this.bucket = this.configService.get<string>('ANAMNESIS_STORAGE_BUCKET') ?? 'anamneses';
    this.basePath = this.normalizeBasePath(
      this.configService.get<string>('ANAMNESIS_STORAGE_BASE_PATH') ?? 'anamneses',
    );
  }

  async upload(input: UploadAnamnesisAttachmentInput): Promise<UploadAnamnesisAttachmentResult> {
    const fileName = this.buildFileName(input.fileName);
    const path = this.composePath([this.basePath, input.tenantId, input.anamnesisId, fileName]);

    const { error } = await this.supabaseService
      .getClient()
      .storage.from(this.bucket)
      .upload(path, input.buffer, {
        cacheControl: '3600',
        contentType: input.mimeType,
        upsert: false,
      });

    if (error) {
      this.logger.error('Falha ao fazer upload de anexo no Supabase Storage', {
        bucket: this.bucket,
        path,
        mimeType: input.mimeType,
        reason: error.message,
      });
      throw new Error('Nao foi possivel salvar o anexo no storage');
    }

    return {
      storagePath: path,
      size: input.buffer.byteLength,
    };
  }

  async delete(input: DeleteAnamnesisAttachmentInput): Promise<void> {
    const path = input.storagePath.startsWith('/') ? input.storagePath.slice(1) : input.storagePath;

    const { error } = await this.supabaseService
      .getClient()
      .storage.from(this.bucket)
      .remove([path]);

    if (error) {
      this.logger.error('Falha ao remover anexo do Supabase Storage', {
        bucket: this.bucket,
        path,
        reason: error.message,
      });
      throw new Error('Nao foi possivel remover o anexo do storage');
    }
  }

  private normalizeBasePath(path: string): string {
    if (!path) {
      return '';
    }

    return path.replace(/^\/+|\/+$/g, '');
  }

  private composePath(segments: (string | undefined | null)[]): string {
    return segments
      .filter((segment): segment is string => Boolean(segment && segment.trim()))
      .map((segment) => segment.replace(/^\/+|\/+$/g, ''))
      .join('/');
  }

  private buildFileName(originalName: string): string {
    const extension = extname(originalName).toLowerCase();
    const baseName = originalName.slice(0, originalName.length - extension.length) || 'anexo';
    const slug = slugify(baseName, { maxLength: 80 });
    const uniqueSuffix = Date.now().toString(36);

    return `${slug || 'anexo'}-${uniqueSuffix}${extension || '.bin'}`;
  }
}
