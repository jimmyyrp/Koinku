import { NextResponse } from 'next/server';
import { query } from '@/lib/supabase-db';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  try {
    const { rows } = await query<{ now: Date }>('SELECT now() AS now');
    return NextResponse.json({
      ok: true,
      database: 'connected',
      checkedAt: rows[0]?.now ?? null,
    });
  } catch (error) {
    console.error('GET /api/health Error:', error);
    const message = error instanceof Error ? error.message : 'Koneksi database gagal';
    const safeMessage = message.replace(/postgres(ql)?:\/\/\S+/gi, '[redacted]');
    return NextResponse.json(
      { ok: false, database: 'error', error: safeMessage },
      { status: 500 }
    );
  }
}
