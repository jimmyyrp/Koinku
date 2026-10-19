import { NextRequest, NextResponse } from 'next/server';
import { toIntId } from '@/lib/id';
import { query } from '@/lib/supabase-db';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numericId = toIntId(id);
    if (numericId == null || numericId <= 0) {
      return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
    }
    const result = await query('DELETE FROM public.transactions WHERE id = $1', [numericId]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/transactions/[id] Error:', error);
    return NextResponse.json({ error: 'Gagal menghapus transaksi' }, { status: 500 });
  }
}
