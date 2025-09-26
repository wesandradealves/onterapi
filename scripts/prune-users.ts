import "reflect-metadata";
import { createClient } from '@supabase/supabase-js';
import { Client as PgClient } from 'pg';
import { resolve } from 'path';
import { readFileSync } from 'fs';

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
        process.env[key.trim()] = value.replace(/^\"|\"$/g, '').trim();
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
    const allowedResult = await pg.query<{ supabase_id: string }>(
      'SELECT supabase_id FROM users'
    );
    const allowed = allowedResult.rows.map((row) => row.supabase_id).filter(Boolean);
    if (!allowed.length) {
      throw new Error('No allowed users found in relational database.');
    }

    const allowedSet = new Set(allowed);
    let deleted = 0;

    let page = 1;
    const perPage = 1000;
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
        if (!allowedSet.has(user.id)) {
          const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
          if (deleteError) {
            console.error('Failed to delete user', user.id, deleteError.message);
          } else {
            deleted += 1;
          }
        }
      }

      page += 1;
    }

    const placeholders = allowed.map((_, index) => `$${index + 1}`).join(', ');
    const deleteQuery = `DELETE FROM users WHERE supabase_id NOT IN (${placeholders})`;
    await pg.query(deleteQuery, allowed);

    console.log('Pruned users from Supabase:', deleted);
    console.log('Allowed supabase IDs:', allowed);
  } finally {
    await pg.end();
  }
};

main().catch((error) => {
  console.error('Prune failed:', error);
  process.exitCode = 1;
});
