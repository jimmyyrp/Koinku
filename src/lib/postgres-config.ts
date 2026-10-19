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

// CA bisa diberikan lewat isi PEM langsung (untuk lingkungan serverless seperti
// Vercel) atau lewat path file (untuk pengembangan lokal).
function loadRootCertificate(): string | undefined {
  const inline = process.env.DATABASE_SSL_ROOT_CERT;
  if (inline && inline.trim()) {
    let pem = inline.trim();
    if (!pem.includes('-----BEGIN')) {
      try {
        pem = Buffer.from(pem, 'base64').toString('utf8');
      } catch {
        // biarkan apa adanya bila bukan base64
      }
    }
    return pem.replace(/\\n/g, '\n');
  }

  const caPath = process.env.DATABASE_SSL_ROOT_CERT_PATH;
  return caPath ? readFileSync(path.resolve(process.cwd(), caPath), 'utf8') : undefined;
}

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

  const ca = loadRootCertificate();
  return {
    connectionString: parsedUrl.toString(),
    ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
  };
}
