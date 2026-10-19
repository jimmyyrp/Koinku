import { NextRequest, NextResponse } from 'next/server';
import { toIntId } from '@/lib/id';
import { query, withTransaction } from '@/lib/supabase-db';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface DebtInput {
  id?: unknown;
  person_name?: unknown;
  personName?: unknown;
  amount?: unknown;
  direction?: unknown;
  note?: unknown;
  debt_date?: unknown;
  debtDate?: unknown;
}

function isValidDebt(input: DebtInput): boolean {
  const personName =
    typeof input.person_name === 'string'
      ? input.person_name.trim()
      : typeof input.personName === 'string'
        ? input.personName.trim()
        : '';
  const amount = Number(input.amount);
  const direction = input.direction;
  const debtDate =
    typeof input.debt_date === 'string'
      ? input.debt_date
      : typeof input.debtDate === 'string'
        ? input.debtDate
        : '';
  return (
    personName.length > 0 &&
    Number.isFinite(amount) &&
    amount > 0 &&
    (direction === 'lend' || direction === 'repay_in' || direction === 'borrow' || direction === 'repay_out') &&
    !Number.isNaN(new Date(debtDate).getTime())
  );
}

export async function GET() {
  try {
    const { rows } = await query<{
      id: string;
      person_name: string;
      amount: string;
      direction: 'lend' | 'repay_in' | 'borrow' | 'repay_out';
      note: string;
      debt_date: Date;
    }>(
      `SELECT id, person_name, amount, direction, note, debt_date
       FROM public.debts
       ORDER BY debt_date DESC, id DESC`
    );
    const debts = rows.map((row) => ({
      id: toIntId(row.id) ?? 0,
      personName: row.person_name,
      amount: Number(row.amount),
      direction: row.direction,
      note: row.note,
      debtDate: new Date(row.debt_date).toISOString(),
    }));
    return NextResponse.json({ debts });
  } catch (error) {
    console.error('GET /api/debts Error:', error);
    return NextResponse.json({ error: 'Gagal membaca data utang' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as DebtInput | DebtInput[];
    const items: DebtInput[] = Array.isArray(body) ? body : [body];
    if (items.length === 0 || !items.every(isValidDebt)) {
      return NextResponse.json({ error: 'Data utang tidak valid' }, { status: 400 });
    }

    const savedIds: number[] = [];
    await withTransaction(async (client) => {
      for (const item of items) {
        const personName =
          typeof item.person_name === 'string'
            ? item.person_name.trim()
            : (item.personName as string).trim();
        const amount = Number(item.amount);
        const direction = item.direction as 'lend' | 'repay_in' | 'borrow' | 'repay_out';
        const note = typeof item.note === 'string' ? item.note.trim() : '';
        const debtDate =
          typeof item.debt_date === 'string'
            ? item.debt_date
            : (item.debtDate as string);
        const requestedId = toIntId(item.id);

        let id: number | null = null;
        if (requestedId != null && requestedId > 0) {
          const existing = await client.query(
            `SELECT id FROM public.debts WHERE id = $1`,
            [requestedId]
          );
          if (existing.rows.length > 0) {
            id = requestedId;
          }
        }

        if (id == null) {
          const inserted = await client.query<{ id: string }>(
            `INSERT INTO public.debts (person_name, amount, direction, note, debt_date)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [personName, amount, direction, note, debtDate]
          );
          id = toIntId(inserted.rows[0].id) ?? 0;
        }
        savedIds.push(id);
      }
    });

    if (Array.isArray(body)) {
      return NextResponse.json({ ok: true, ids: savedIds });
    }
    return NextResponse.json({ ok: true, id: savedIds[0] });
  } catch (error) {
    console.error('POST /api/debts Error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan data utang' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { rowCount } = await query(`DELETE FROM public.debts`);
    return NextResponse.json({ ok: true, deleted: rowCount ?? 0 });
  } catch (error) {
    console.error('DELETE /api/debts Error:', error);
    return NextResponse.json({ error: 'Gagal menghapus data utang' }, { status: 500 });
  }
}