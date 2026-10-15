import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { nextId, normalizeCategoryId, toIntId } from '@/lib/id';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getDb();
    const categories = await db
      .collection('categories')
      .find({})
      .sort({ name: 1 })
      .toArray();

    const data = categories.map((c) => ({
      id: toIntId(c.id) ?? 0,
      name: c.name,
      type: c.type,
      color: c.color,
      budget: Number(c.budget) || 0,
    }));

    return NextResponse.json({ categories: data });
  } catch (err) {
    console.error('GET /api/categories Error:', err);
    return NextResponse.json({ error: 'Gagal membaca kategori' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = Array.isArray(body) ? body : [body];

    if (items.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data' }, { status: 400 });
    }

    const db = await getDb();
    const coll = db.collection('categories');
    const ids: number[] = [];

    for (const cat of items) {
      let id = normalizeCategoryId(cat.id);
      if (id === null || id <= 0) {
        id = await nextId(db, 'categories');
      }
      ids.push(id);

      await coll.updateOne(
        { id },
        {
          $set: {
            id,
            name: cat.name,
            type: cat.type,
            color: cat.color,
            budget: cat.budget ? Number(cat.budget) : 0,
          },
          $setOnInsert: {
            createdAt: new Date().toISOString(),
          },
        },
        { upsert: true }
      );
    }

    return NextResponse.json(
      Array.isArray(body) ? { ok: true, ids } : { ok: true, id: ids[0] }
    );
  } catch (err) {
    console.error('POST /api/categories Error:', err);
    return NextResponse.json({ error: 'Gagal menyimpan kategori' }, { status: 500 });
  }
}