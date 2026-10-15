import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { toIntId } from '@/lib/id';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numericId = toIntId(id);
    if (numericId == null) {
      return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
    }
    const body = await req.json();

    const db = await getDb();
    await db
      .collection('categories')
      .updateOne({ id: numericId }, { $set: { budget: Number(body.budget) || 0 } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/categories/[id] Error:', err);
    return NextResponse.json({ error: 'Gagal memperbarui kategori' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numericId = toIntId(id);
    if (numericId == null) {
      return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
    }
    const db = await getDb();
    await db.collection('categories').deleteOne({ id: numericId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/categories/[id] Error:', err);
    return NextResponse.json({ error: 'Gagal menghapus kategori' }, { status: 500 });
  }
}