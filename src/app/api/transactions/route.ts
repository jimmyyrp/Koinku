import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { nextId, normalizeCategoryId, toIntId } from '@/lib/id';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getDb();
    const transactions = await db
      .collection('transactions')
      .find({})
      .sort({ date: -1 })
      .toArray();

    const data = transactions.map((t) => ({
      id: toIntId(t.id) ?? 0,
      description: t.description,
      amount: Number(t.amount),
      date: t.date,
      type: t.type,
      categoryId: normalizeCategoryId(t.category_id ?? t.categoryId) ?? 0,
    }));

    return NextResponse.json({ transactions: data });
  } catch (err) {
    console.error('GET /api/transactions Error:', err);
    return NextResponse.json({ error: 'Gagal membaca transaksi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.description) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const db = await getDb();
    const coll = db.collection('transactions');

    const categoryId = normalizeCategoryId(body.category_id ?? body.categoryId);
    const requestedId = toIntId(body.id);

    let id: number;
    let wasEdit = false;

    if (requestedId !== null && requestedId > 0) {
      const existing = await coll.findOne({ id: requestedId }, { projection: { _id: 1 } });
      if (existing) {
        id = requestedId;
        wasEdit = true;
      } else {
        id = await nextId(db, 'transactions');
      }
    } else {
      id = await nextId(db, 'transactions');
    }

    const doc = {
      id,
      description: body.description,
      amount: Number(body.amount) || 0,
      date: body.date || new Date().toISOString(),
      type: body.type,
      category_id: categoryId,
      categoryId,
    };

    await coll.updateOne(
      { id },
      { $set: { ...doc, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, id, edit: wasEdit });
  } catch (err) {
    console.error('POST /api/transactions Error:', err);
    return NextResponse.json({ error: 'Gagal menyimpan transaksi' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const db = await getDb();
    await db.collection('transactions').deleteMany({});
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/transactions Error:', err);
    return NextResponse.json({ error: 'Gagal membersihkan transaksi' }, { status: 500 });
  }
}