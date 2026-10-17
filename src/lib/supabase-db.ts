import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import { getSecurePostgresConfig } from './postgres-config';

declare global {
  // eslint-disable-next-line no-var
  var _koinkuPostgresPool: Pool | undefined;
}

export function getPool(): Pool {
  if (global._koinkuPostgresPool) return global._koinkuPostgresPool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL belum dikonfigurasi di .env.local');
  }

  const pool = new Pool({
    ...getSecurePostgresConfig(connectionString),
    max: 10,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });
  pool.on('error', (error) => {
    console.error('[PostgreSQL] Koneksi idle mengalami error:', error);
  });
  global._koinkuPostgresPool = pool;
  return pool;
}

export async function withTransaction<T>(
  work: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function query<Row extends QueryResultRow = QueryResultRow>(
  text: string,
  values?: unknown[]
): Promise<QueryResult<Row>> {
  return getPool().query<Row>(text, values);
}
