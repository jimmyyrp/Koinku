import { NextRequest, NextResponse } from 'next/server';
import { normalizeCategoryId, toIntId } from '@/lib/id';
import { query, withTransaction } from '@/lib/supabase-db';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface TransactionInput {
  id?: unknown;
  description?: unknown;
  amount?: unknown;
  date?: unknown;
  type?: unknown;
  category_id?: unknown;
  categoryId?: unknown;
  paid_by_id?: unknown;
  paidById?: unknown;
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
      paid_by_id: string | null;
      paid_by_name: string | null;
      paid_by_is_self: boolean | null;
    }>(
      `SELECT t.id, t.description, t.amount, t.date, t.type, t.category_id,
              t.paid_by_id, p.name AS paid_by_name, p.is_self AS paid_by_is_self
       FROM public.transactions t
       LEFT JOIN public.people p ON p.id = t.paid_by_id
       ORDER BY t.date DESC, t.id DESC`
    );
    const transactions = rows.map((transaction) => ({
      id: toIntId(transaction.id) ?? 0,
      description: transaction.description,
      amount: Number(transaction.amount),
      date: new Date(transaction.date).toISOString(),
      type: transaction.type,
      categoryId: normalizeCategoryId(transaction.category_id) ?? 0,
      paidById: toIntId(transaction.paid_by_id),
      paidByName: transaction.paid_by_name,
      paidByIsSelf: transaction.paid_by_is_self,
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
    const paidById = toIntId(body.paid_by_id ?? body.paidById);

    if (
      !description ||
      !Number.isFinite(amount) ||
      amount < 0 ||
      (type !== 'income' && type !== 'expense') ||
      Number.isNaN(rawDate.getTime()) ||
      (categoryId != null && categoryId <= 0) ||
      (paidById != null && paidById <= 0)
    ) {
      return NextResponse.json({ error: 'Data transaksi tidak valid' }, { status: 400 });
    }

    const result = await withTransaction(async (client) => {
      if (requestedId != null && requestedId > 0) {
        const updated = await client.query<{ id: string }>(
          `UPDATE public.transactions
           SET description = $1, amount = $2, date = $3, type = $4,
               category_id = $5, paid_by_id = $6, updated_at = now()
           WHERE id = $7
           RETURNING id`,
          [description, amount, rawDate.toISOString(), type, categoryId, paidById, requestedId]
        );
        if (updated.rowCount) {
          return { id: Number(updated.rows[0].id), edit: true };
        }
      }

      const inserted = await client.query<{ id: string }>(
        `INSERT INTO public.transactions
           (description, amount, date, type, category_id, paid_by_id, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, now())
         RETURNING id`,
        [description, amount, rawDate.toISOString(), type, categoryId, paidById]
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
    await withTransaction(async (client) => {
      await client.query('DELETE FROM public.transactions');
      // Tandai reset agar klien membuang cache lokal dan tidak mengirim balik data lama.
      await client.query(
        `UPDATE public.profiles SET data_reset_at = now() WHERE id = 'global'`
      );
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/transactions Error:', error);
    return NextResponse.json({ error: 'Gagal membersihkan transaksi' }, { status: 500 });
  }
}
