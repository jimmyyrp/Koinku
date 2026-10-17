import { NextRequest, NextResponse } from 'next/server';
import { normalizeCategoryId, toIntId } from '@/lib/id';
import { query, withTransaction } from '@/lib/supabase-db';

export const dynamic = 'force-dynamic';

interface TransactionInput {
  id?: unknown;
  description?: unknown;
  amount?: unknown;
  date?: unknown;
  type?: unknown;
  category_id?: unknown;
  categoryId?: unknown;
}

export async function GET(req: NextRequest) {
  try {
    const { rows } = await query<{
      id: string;
      description: string;
      amount: string;
      date: Date;
      type: 'income' | 'expense';
      category_id: string | null;
    }>(
      `SELECT id, description, amount, date, type, category_id
       FROM public.transactions
       ORDER BY date DESC, id DESC`
    );
    const transactions = rows.map((transaction) => ({
      id: toIntId(transaction.id) ?? 0,
      description: transaction.description,
      amount: Number(transaction.amount),
      date: new Date(transaction.date).toISOString(),
      type: transaction.type,
      categoryId: normalizeCategoryId(transaction.category_id) ?? 0,
    }));
    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('GET /api/transactions Error:', error);
    return NextResponse.json({ error: 'Gagal membaca transaksi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TransactionInput;
    const description =
      typeof body.description === 'string' ? body.description.trim() : '';
    const amount = Number(body.amount);
    const type = body.type;
    const requestedId = toIntId(body.id);
    const rawDate = body.date == null ? new Date() : new Date(String(body.date));
    const categoryId = normalizeCategoryId(body.category_id ?? body.categoryId);

    if (
      !description ||
      !Number.isFinite(amount) ||
      amount < 0 ||
      (type !== 'income' && type !== 'expense') ||
      Number.isNaN(rawDate.getTime()) ||
      (categoryId != null && categoryId <= 0)
    ) {
      return NextResponse.json({ error: 'Data transaksi tidak valid' }, { status: 400 });
    }

    const result = await withTransaction(async (client) => {
      if (requestedId != null && requestedId > 0) {
        const updated = await client.query<{ id: string }>(
          `UPDATE public.transactions
           SET description = $1, amount = $2, date = $3, type = $4,
               category_id = $5, updated_at = now()
           WHERE id = $6
           RETURNING id`,
          [description, amount, rawDate.toISOString(), type, categoryId, requestedId]
        );
        if (updated.rowCount) {
          return { id: Number(updated.rows[0].id), edit: true };
        }
      }

      const inserted = await client.query<{ id: string }>(
        `INSERT INTO public.transactions
           (description, amount, date, type, category_id, updated_at)
         VALUES ($1, $2, $3, $4, $5, now())
         RETURNING id`,
        [description, amount, rawDate.toISOString(), type, categoryId]
      );
      return { id: Number(inserted.rows[0].id), edit: false };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('POST /api/transactions Error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan transaksi' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await query('DELETE FROM public.transactions');
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/transactions Error:', error);
    return NextResponse.json({ error: 'Gagal membersihkan transaksi' }, { status: 500 });
  }
}
