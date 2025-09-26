import "reflect-metadata";
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Client as PgClient } from 'pg';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { mapRoleToDomain } from '../src/shared/utils/role.utils';
import { RolesEnum } from '../src/domain/auth/enums/roles.enum';

type Metadata = Record<string, unknown>;
type QueryResultWithRowCount = {
  rowCount?: number;
  rows: any[];
};

const loadEnv = () => {
  const envFile = resolve(__dirname, '../.env');
  try {
    const content = readFileSync(envFile, 'utf-8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) {
        continue;
      }
      const parts = line.split('=');
      const key = parts.shift();
      if (!key) {
        continue;
      }
      const value = parts.join('=');
      if (!(key in process.env)) {
        process.env[key.trim()] = value.replace(/^"|"$/g, '').trim();
      }
    }
  } catch (error) {
    // .env opcional para scripts CLI
  }
};

const ensureEnv = (keys: string[]) => {
  const missing = keys.filter((key) => !process.env[key] || !String(process.env[key]).trim().length);
  if (missing.length) {
    throw new Error(`Variaveis de ambiente pendentes: ${missing.join(', ')}`);
  }
};

const createSupabaseClient = (): SupabaseClient =>
  createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

const createPgClient = () =>
  new PgClient({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    ssl:
      process.env.DB_SSL === 'true' || process.env.DB_SSL === '1'
        ? { rejectUnauthorized: false }
        : undefined,
  });

const parseEmailFilter = (raw: string | undefined | null): Set<string> | null => {
  if (!raw) {
    return null;
  }

  const emails = raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length);

  return emails.length ? new Set(emails) : null;
};

const isForceEnabled = () =>
  process.argv.includes('--force') ||
  String(process.env.SUPER_ADMIN_FORCE_UPDATE).toLowerCase() === 'true' ||
  String(process.env.SUPER_ADMIN_FORCE_UPDATE).toLowerCase() === '1';

const isDryRun = () => process.argv.includes('--dry-run');

const ensureTenantMetadata = (metadata: Metadata, tenantId: string): Metadata => {
  const currentTenant = typeof metadata.tenantId === 'string' ? metadata.tenantId.trim() : '';
  const legacyTenant = typeof metadata.tenant_id === 'string' ? (metadata.tenant_id as string).trim() : '';

  if (currentTenant === tenantId && legacyTenant === tenantId) {
    return metadata;
  }

  return {
    ...metadata,
    tenantId,
    tenant_id: tenantId,
  };
};

const main = async () => {
  loadEnv();
  ensureEnv([
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DB_HOST',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_DATABASE',
    'SUPER_ADMIN_TENANT_ID',
  ]);

  const targetTenantId = String(process.env.SUPER_ADMIN_TENANT_ID).trim();
  if (!targetTenantId) {
    throw new Error('SUPER_ADMIN_TENANT_ID nao pode ser vazio.');
  }

  const allowedEmails = parseEmailFilter(process.env.SUPER_ADMIN_EMAILS);
  const forceUpdate = isForceEnabled();
  const dryRun = isDryRun();

  const supabase = createSupabaseClient();
  const pg = createPgClient();
  await pg.connect();

  let page = 1;
  const perPage = 500;

  let processed = 0;
  let matchedSuperAdmins = 0;
  let metadataUpdated = 0;
  let relationalUpdated = 0;
  let skippedByFilter = 0;
  let skippedByConflict = 0;
  let skippedMissingEmail = 0;
  let missingRelational = 0;

  try {
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) {
        throw new Error(`Supabase listUsers error: ${error.message}`);
      }

      const users = data?.users ?? [];
      if (!users.length) {
        break;
      }

      for (const user of users) {
        processed += 1;
        const metadata = (user.user_metadata as Metadata) || {};
        const role = mapRoleToDomain(metadata.role as string) ?? RolesEnum.PATIENT;

        if (role !== RolesEnum.SUPER_ADMIN) {
          continue;
        }

        matchedSuperAdmins += 1;

        const email = (user.email || '').trim();
        if (!email) {
          skippedMissingEmail += 1;
          console.warn(`[WARN] Super admin sem email encontrado. SupabaseId=${user.id}`);
          continue;
        }

        const normalizedEmail = email.toLowerCase();
        if (allowedEmails && !allowedEmails.has(normalizedEmail)) {
          skippedByFilter += 1;
          continue;
        }

        const tenantIdFromMetadata =
          typeof metadata.tenantId === 'string' && metadata.tenantId.trim().length
            ? metadata.tenantId.trim()
            : typeof metadata.tenant_id === 'string' && metadata.tenant_id.trim().length
              ? (metadata.tenant_id as string).trim()
              : null;

        if (tenantIdFromMetadata && tenantIdFromMetadata !== targetTenantId && !forceUpdate) {
          skippedByConflict += 1;
          console.warn(
            `[WARN] Tenant divergente detectado para ${email}. Atual=${tenantIdFromMetadata} | Destino=${targetTenantId}. Use --force para sobrescrever.`,
          );
          continue;
        }

        const finalMetadata = ensureTenantMetadata(metadata, targetTenantId);

        if (!dryRun) {
          if (tenantIdFromMetadata !== targetTenantId || metadata.tenant_id !== targetTenantId) {
            const updateResult = await supabase.auth.admin.updateUserById(user.id, {
              user_metadata: finalMetadata,
            });

            if (updateResult.error) {
              throw new Error(`Falha ao atualizar metadata do usuario ${email}: ${updateResult.error.message}`);
            }

            metadataUpdated += 1;
          }
        } else {
          console.log(`[dry-run] Atualizaria metadata para ${email}`);
        }

        if (!dryRun) {
          const relationalResult = (await pg.query(
            'UPDATE users SET tenant_id = $1, metadata = $2, updated_at = now() WHERE supabase_id = $3 RETURNING id',
            [targetTenantId, finalMetadata, user.id],
          )) as QueryResultWithRowCount;

          const updatedRows =
            typeof relationalResult.rowCount === 'number'
              ? relationalResult.rowCount
              : relationalResult.rows?.length ?? 0;

          if (updatedRows > 0) {
            relationalUpdated += updatedRows;
          } else {
            missingRelational += 1;
            console.warn(
              `[WARN] Usuario SUPER_ADMIN ${email} nao encontrado na tabela relacional (supabase_id=${user.id}).`,
            );
          }
        } else {
          console.log(`[dry-run] Atualizaria registro relacional de ${email}`);
        }
      }

      page += 1;
    }
  } finally {
    await pg.end();
  }

  console.log('Processados:', processed);
  console.log('SUPER_ADMIN encontrados:', matchedSuperAdmins);
  console.log('Metadata atualizada:', metadataUpdated);
  console.log('Registros relacionais atualizados:', relationalUpdated);
  if (skippedByFilter) {
    console.log('Ignorados pelo filtro de email:', skippedByFilter);
  }
  if (skippedByConflict) {
    console.log('Ignorados por conflito de tenant (use --force para sobrescrever):', skippedByConflict);
  }
  if (skippedMissingEmail) {
    console.log('SUPER_ADMIN sem email cadastrado:', skippedMissingEmail);
  }
  if (missingRelational) {
    console.log('Nao encontrados na base relacional:', missingRelational);
  }
};

main().catch((error) => {
  console.error('Falha ao atribuir tenant aos super admins:', error);
  process.exitCode = 1;
});
