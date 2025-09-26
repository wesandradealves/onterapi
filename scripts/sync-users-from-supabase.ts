import "reflect-metadata";
import { createClient } from '@supabase/supabase-js';
import { Client as PgClient } from 'pg';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { slugify } from '../src/shared/utils/slug.util';
import { randomUUID } from 'crypto';

type Metadata = Record<string, unknown>;

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
    // optional
  }
};

const ensureEnv = (keys: string[]) => {
  const missing = keys.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error('Missing env vars: ' + missing.join(', '));
  }
};

const createSupabaseClient = () =>
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

const ensureSlug = (metadata: Metadata, fallback: string) => {
  const raw = typeof metadata.slug === 'string' ? metadata.slug.trim() : '';
  if (raw) {
    return raw;
  }
  const base = slugify((metadata.name as string) || fallback);
  return base || slugify(fallback);
};

const ensureUserId = (metadata: Metadata, supabaseId: string) => {
  const raw = typeof metadata.id === 'string' && metadata.id.length ? metadata.id : undefined;
  return raw ?? supabaseId ?? randomUUID();
};

const toDbRole = (role?: string) => {
  if (!role) {
    return 'patient';
  }
  return role.toLowerCase();
};

const INSERT_SQL = 'INSERT INTO users (id, supabase_id, slug, email, name, cpf, phone, role, tenant_id, is_active, email_verified, two_factor_enabled, metadata, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now(),now())';

const UPDATE_SQL = 'UPDATE users SET slug = $2, name = $3, phone = $4, role = $5, tenant_id = $6, is_active = $7, email_verified = $8, two_factor_enabled = $9, metadata = $10, updated_at = now() WHERE supabase_id = $1 AND (slug IS DISTINCT FROM $2 OR name IS DISTINCT FROM $3 OR phone IS DISTINCT FROM $4 OR role IS DISTINCT FROM $5 OR tenant_id IS DISTINCT FROM $6 OR is_active IS DISTINCT FROM $7 OR email_verified IS DISTINCT FROM $8 OR two_factor_enabled IS DISTINCT FROM $9 OR metadata IS DISTINCT FROM $10) RETURNING id';

const main = async () => {
  loadEnv();
  ensureEnv([
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DB_HOST',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_DATABASE',
  ]);

  const supabase = createSupabaseClient();
  const pg = createPgClient();
  await pg.connect();

  try {
    const existingResult = await pg.query<{ supabase_id: string }>('SELECT supabase_id FROM users');
    const existingIds = new Set(existingResult.rows.map((row) => row.supabase_id));

    let page = 1;
    const perPage = 1000;
    let inserted = 0;
    let updated = 0;

    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) {
        throw error;
      }

      const users = data?.users ?? [];
      if (!users.length) {
        break;
      }

      for (const user of users) {
        const metadata = (user.user_metadata || {}) as Metadata;
        const slug = ensureSlug(metadata, user.email || user.id);
        const name = (metadata.name as string) || user.email || 'Usuario';
        const cpf = (metadata.cpf as string) || null;
        const tenantId = (metadata.tenantId as string) || null;
        const phone = (metadata.phone as string) || null;
        const role = (metadata.role as string) || 'PATIENT';
        const roleDb = toDbRole(role);
        const isActive = metadata.isActive !== false;
        const emailVerified = metadata.emailVerified === true || metadata.email_verified === true;
        const twoFactorEnabled = metadata.twoFactorEnabled === true;

        if (!existingIds.has(user.id)) {
          if (!cpf) {
            console.warn('Skipping', user.email || user.id, 'missing CPF');
            continue;
          }

          const id = ensureUserId(metadata, user.id);

          await pg.query(
            INSERT_SQL,
            [
              id,
              user.id,
              slug,
              user.email,
              name,
              cpf,
              phone,
              roleDb,
              tenantId,
              isActive,
              emailVerified,
              twoFactorEnabled,
              metadata,
            ],
          );
          existingIds.add(user.id);
          inserted += 1;
          continue;
        }

        const updateResult = await pg.query(
          UPDATE_SQL,
          [
            user.id,
            slug,
            name,
            phone,
            roleDb,
            tenantId,
            isActive,
            emailVerified,
            twoFactorEnabled,
            metadata,
          ],
        );

        if (updateResult.rows.length) {
          updated += updateResult.rows.length;
        }
      }

      page += 1;
    }

    console.log('Inserted users:', inserted);
    console.log('Updated users:', updated);
  } finally {
    await pg.end();
  }
};

main().catch((error) => {
  console.error('Sync failed:', error);
  process.exitCode = 1;
});
