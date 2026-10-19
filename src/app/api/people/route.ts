import { NextRequest, NextResponse } from 'next/server';
import { toIntId } from '@/lib/id';
import { query, withTransaction } from '@/lib/supabase-db';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface PersonInput {
  id?: unknown;
  name?: unknown;
  is_self?: unknown;
  isSelf?: unknown;
}

export async function GET() {
  try {
    const { rows } = await query<{ id: string; name: string; is_self: boolean }>(
      `SELECT id, name, is_self
       FROM public.people
       ORDER BY is_self DESC, name ASC`
    );
    const people = rows.map((person) => ({
      id: toIntId(person.id) ?? 0,
      name: person.name,
      isSelf: person.is_self,
    }));
    return NextResponse.json({ people });
  } catch (error) {
    console.error('GET /api/people Error:', error);
    return NextResponse.json({ error: 'Gagal membaca data orang' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items: PersonInput[] = Array.isArray(body) ? body : [body];
    if (items.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data' }, { status: 400 });
    }

    const names = items.map((item) =>
      typeof item.name === 'string' ? item.name.trim() : ''
    );
    if (names.some((name) => !name)) {
      return NextResponse.json({ error: 'Nama orang tidak valid' }, { status: 400 });
    }

    const ids = await withTransaction(async (client) => {
      const savedIds: number[] = [];
      for (let i = 0; i < items.length; i += 1) {
        const name = names[i];
        const isSelf = items[i].is_self === true || items[i].isSelf === true;

        const existing = await client.query<{ id: string }>(
          `SELECT id FROM public.people WHERE lower(trim(name)) = lower($1) LIMIT 1`,
          [name]
        );
        if (existing.rowCount) {
          savedIds.push(toIntId(existing.rows[0].id) ?? 0);
          continue;
        }

        const inserted = await client.query<{ id: string }>(
          `INSERT INTO public.people (name, is_self)
           VALUES ($1, $2)
           ON CONFLICT (lower(trim(name))) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [name, isSelf]
        );
        savedIds.push(toIntId(inserted.rows[0].id) ?? 0);
      }

      await client.query(`
        SELECT setval(
          pg_get_serial_sequence('public.people', 'id'),
          GREATEST(COALESCE((SELECT max(id) FROM public.people), 1), 1),
          EXISTS (SELECT 1 FROM public.people)
        )
      `);
      return savedIds;
    });

    return NextResponse.json(
      Array.isArray(body) ? { ok: true, ids } : { ok: true, id: ids[0] }
    );
  } catch (error) {
    console.error('POST /api/people Error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan data orang' }, { status: 500 });
  }
}
