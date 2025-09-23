import "reflect-metadata";
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Client as PgClient } from 'pg';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { slugify } from '../src/shared/utils/slug.util';

interface UserRow {
  id: string;
  supabase_id: string;
  slug: string;
}

const loadEnv = () => {
  const envFile = resolve(__dirname, '../.env');
  try {
    const content = readFileSync(envFile, 'utf-8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) {
        continue;
      }
      const [key, ...rest] = line.split('=');
      if (!key) {
        continue;
      }
      const value = rest.join('=');
      if (!(key in process.env)) {
        process.env[key.trim()] = value.replace(/^"|"$/g, '').trim();
      }
    }
  } catch (error) {
    // optional .env for CLI usage
  }
};

const ensureConfig = (keys: string[]) => {
  const missing = keys.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

const createSupabaseClient = (): SupabaseClient => {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

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

const main = async () => {
  loadEnv();
  ensureConfig([
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DB_HOST',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_DATABASE',
  ]);

  const supabase = createSupabaseClient();
  const pgClient = createPgClient();
  await pgClient.connect();

  try {
    const { rows } = await pgClient.query<UserRow>(
      'SELECT id, supabase_id, slug FROM users WHERE deleted_at IS NULL OR deleted_at IS NOT NULL',
    );

    const slugMap = new Map<string, string>();
    const usedSlugs = new Set<string>();

    for (const row of rows) {
      if (row.supabase_id && row.slug) {
        slugMap.set(row.supabase_id, row.slug);
        usedSlugs.add(row.slug);
      }
    }

    if (!slugMap.size) {
      console.warn('No user slugs found in relational database. Aborting.');
      return;
    }

    let page = 1;
    const perPage = 1000;
    let processed = 0;
    let updated = 0;
    let skipped = 0;
    const missing: string[] = [];

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
        const currentMetadata = (user.user_metadata as Record<string, unknown>) || {};
        const existingSlug = typeof currentMetadata.slug === 'string' ? currentMetadata.slug.trim() : '';
        let targetSlug = slugMap.get(user.id);

        if (!targetSlug) {
          const base = slugify((currentMetadata.name as string) || user.email || user.id);
          let candidate = base;
          let counter = 1;
          while (usedSlugs.has(candidate)) {
            candidate = `${base}-${++counter}`;
          }
          targetSlug = candidate;
          usedSlugs.add(candidate);
          slugMap.set(user.id, candidate);
          missing.push(user.id);
        }

        if (existingSlug === targetSlug) {
          skipped += 1;
          continue;
        }

        const nextMetadata = { ...currentMetadata, slug: targetSlug };
        const updateResult = await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: nextMetadata,
        });

        if (updateResult.error) {
          console.error(
            `Failed to update user ${user.email ?? user.id}: ${updateResult.error.message}`,
          );
          continue;
        }

        updated += 1;
      }

      page += 1;
    }

    console.log(`Processed users: ${processed}`);
    console.log(`Updated metadata: ${updated}`);
    console.log(`Already aligned: ${skipped}`);

    if (missing.length) {
      console.warn(`Users without matching relational record: ${missing.length}`);
    }
  } finally {
    await pgClient.end();
  }
};

main().catch((error) => {
  console.error('Backfill failed:', error);
  process.exitCode = 1;
});
