import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const loadEnvFile = () => {
  const envFile = resolve(__dirname, '../../../.env');

  try {
    const content = readFileSync(envFile, 'utf-8');
    content.split(/\r?\n/).forEach((line) => {
      if (!line || line.trim().startsWith('#')) {
        return;
      }
      const [key, ...rest] = line.split('=');
      if (!key) {
        return;
      }
      const value = rest.join('=').trim();
      if (!(key in process.env)) {
        process.env[key.trim()] = value.replace(/^"|"$/g, '');
      }
    });
  } catch (error) {
    // .env optional for CLI usage
  }
};

if (process.env.LOAD_ENV !== 'false') {
  loadEnvFile();
}

const sslEnabled = process.env.DB_SSL === 'true' || process.env.DB_SSL === '1';

const TypeOrmDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  schema: process.env.DB_SCHEMA || 'public',
  ssl: sslEnabled
    ? {
        rejectUnauthorized: false,
      }
    : false,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/infrastructure/database/migrations/*{.ts,.js}'],
  synchronize: false,
  migrationsRun: false,
  logging: false,
});

export default TypeOrmDataSource;
