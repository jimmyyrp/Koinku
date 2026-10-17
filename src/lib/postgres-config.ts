import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { PoolConfig } from 'pg';

const TLS_CONNECTION_PARAMETERS = new Set([
  'ssl',
  'sslmode',
  'sslcert',
  'sslkey',
  'sslpassword',
  'sslrootcert',
  'sslnegotiation',
  'uselibpqcompat',
]);

export function getSecurePostgresConfig(
  connectionString: string
): Pick<PoolConfig, 'connectionString' | 'ssl'> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(connectionString);
  } catch {
    throw new Error('DATABASE_URL bukan URL PostgreSQL yang valid');
  }
  if (parsedUrl.protocol !== 'postgres:' && parsedUrl.protocol !== 'postgresql:') {
    throw new Error('DATABASE_URL harus menggunakan protokol PostgreSQL');
  }

  // URL TLS parameters override node-postgres's explicit SSL options.
  for (const key of Array.from(parsedUrl.searchParams.keys())) {
    if (TLS_CONNECTION_PARAMETERS.has(key.toLowerCase())) {
      parsedUrl.searchParams.delete(key);
    }
  }

  const caPath = process.env.DATABASE_SSL_ROOT_CERT_PATH;
  const ca = caPath ? readFileSync(path.resolve(process.cwd(), caPath), 'utf8') : undefined;
  return {
    connectionString: parsedUrl.toString(),
    ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
  };
}
