import { NextRequest, NextResponse } from 'next/server';
import { toIntId } from '@/lib/id';
import { query } from '@/lib/supabase-db';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numericId = toIntId(id);
    if (numericId == null || numericId <= 0) {
      return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
    }
    const body = await req.json();
    const budget = Number(body.budget);
    if (!Number.isFinite(budget) || budget < 0) {
      return NextResponse.json({ error: 'Anggaran tidak valid' }, { status: 400 });
    }

    const result = await query(
      'UPDATE public.categories SET budget = $1 WHERE id = $2',
      [budget, numericId]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH /api/categories/[id] Error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui kategori' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numericId = toIntId(id);
    if (numericId == null || numericId <= 0) {
      return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
    }
    const result = await query('DELETE FROM public.categories WHERE id = $1', [numericId]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/categories/[id] Error:', error);
    return NextResponse.json({ error: 'Gagal menghapus kategori' }, { status: 500 });
  }
}
