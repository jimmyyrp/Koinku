import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { toIntId } from '@/lib/id';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numericId = toIntId(id);
    if (numericId == null) {
      return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
    }
    const db = await getDb();
    await db.collection('transactions').deleteOne({ id: numericId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/transactions/[id] Error:', err);
    return NextResponse.json({ error: 'Gagal menghapus transaksi' }, { status: 500 });
  }
}