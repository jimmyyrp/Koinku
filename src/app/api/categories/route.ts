import { NextRequest, NextResponse } from 'next/server';
import { normalizeCategoryId, toIntId } from '@/lib/id';
import { query, withTransaction } from '@/lib/supabase-db';

export const dynamic = 'force-dynamic';

interface CategoryInput {
  id?: unknown;
  name?: unknown;
  type?: unknown;
  color?: unknown;
  budget?: unknown;
}

const isValidCategory = (category: CategoryInput) => {
  const budget = category.budget == null ? 0 : Number(category.budget);
  return (
    typeof category.name === 'string' &&
    category.name.trim().length > 0 &&
    (category.type === 'income' || category.type === 'expense') &&
    (category.color == null || typeof category.color === 'string') &&
    Number.isFinite(budget) &&
    budget >= 0
  );
};

export async function GET(req: NextRequest) {
  try {
    const { rows } = await query<{
      id: string;
      name: string;
      type: 'income' | 'expense';
      color: string;
      budget: string;
    }>(
      `SELECT id, name, type, color, budget
       FROM public.categories
       ORDER BY name ASC`
    );
    const categories = rows.map((category) => ({
      id: toIntId(category.id) ?? 0,
      name: category.name,
      type: category.type,
      color: category.color,
      budget: Number(category.budget) || 0,
    }));
    return NextResponse.json({ categories });
  } catch (error) {
    console.error('GET /api/categories Error:', error);
    return NextResponse.json({ error: 'Gagal membaca kategori' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items: CategoryInput[] = Array.isArray(body) ? body : [body];
    if (items.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data' }, { status: 400 });
    }
    if (!items.every(isValidCategory)) {
      return NextResponse.json({ error: 'Data kategori tidak valid' }, { status: 400 });
    }

    const ids = await withTransaction(async (client) => {
      const savedIds: number[] = [];
      for (const category of items) {
        const id = normalizeCategoryId(category.id);
        const name = (category.name as string).trim();
        const type = category.type as 'income' | 'expense';
        const color = typeof category.color === 'string' ? category.color : '#57606f';
        const budget = category.budget == null ? 0 : Number(category.budget);
        const result =
          id != null && id > 0
            ? await client.query<{ id: string }>(
                `INSERT INTO public.categories (id, name, type, color, budget)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (id) DO UPDATE
                 SET name = EXCLUDED.name,
                     type = EXCLUDED.type,
                     color = EXCLUDED.color,
                     budget = EXCLUDED.budget
                 RETURNING id`,
                [id, name, type, color, budget]
              )
            : await client.query<{ id: string }>(
                `INSERT INTO public.categories (name, type, color, budget)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id`,
                [name, type, color, budget]
              );
        savedIds.push(Number(result.rows[0].id));
      }

      await client.query(`
        SELECT setval(
          pg_get_serial_sequence('public.categories', 'id'),
          GREATEST(COALESCE((SELECT max(id) FROM public.categories), 1), 1),
          EXISTS (SELECT 1 FROM public.categories)
        )
      `);
      return savedIds;
    });

    return NextResponse.json(
      Array.isArray(body) ? { ok: true, ids } : { ok: true, id: ids[0] }
    );
  } catch (error) {
    console.error('POST /api/categories Error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan kategori' }, { status: 500 });
  }
}
