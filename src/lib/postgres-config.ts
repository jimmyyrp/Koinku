import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { PoolConfig } from 'pg';
import { SUPABASE_ROOT_CA } from './supabase-ca';

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

const BUNDLED_CA_PATH = 'supabase/certs/prod-ca-2021.crt';

function readCertificateFile(caPath: string): string | undefined {
  try {
    const resolved = path.resolve(process.cwd(), caPath);
    if (!existsSync(resolved)) return undefined;
    return readFileSync(resolved, 'utf8');
  } catch {
    return undefined;
  }
}

// CA bisa diberikan lewat isi PEM langsung (untuk lingkungan serverless seperti
// Vercel) atau lewat path file (untuk pengembangan lokal). Bila keduanya tidak
// tersedia, pakai sertifikat yang dibundel agar koneksi TLS tetap terverifikasi
// di Vercel (berkas .crt di-ignore oleh git).
function loadRootCertificate(): string {
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
  if (caPath) {
    const fromEnvPath = readCertificateFile(caPath);
    if (fromEnvPath) return fromEnvPath;
  }

  const bundled = readCertificateFile(BUNDLED_CA_PATH);
  return bundled ?? SUPABASE_ROOT_CA;
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

  if (/^db\.[^.]+\.supabase\.co$/i.test(parsedUrl.hostname)) {
    console.warn(
      '[PostgreSQL] Host langsung Supabase biasanya hanya IPv6 dan gagal di Vercel. ' +
        'Gunakan connection pooler (aws-0-<region>.pooler.supabase.com).'
    );
  }

  const ca = loadRootCertificate();
  return {
    connectionString: parsedUrl.toString(),
    ssl: { rejectUnauthorized: true, ca },
  };
}
