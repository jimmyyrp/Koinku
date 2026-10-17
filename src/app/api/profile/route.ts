import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/supabase-db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { rows } = await query<{
      initial_balance: string;
      emergency_fund_target: string;
    }>(
      `SELECT initial_balance, emergency_fund_target
       FROM public.profiles
       WHERE id = 'global'`
    );
    const profile = rows[0];
    return NextResponse.json({
      profile: {
        initialBalance: Number(profile?.initial_balance ?? 0),
        emergencyFundTarget: Number(profile?.emergency_fund_target ?? 20000000),
      },
    });
  } catch (error) {
    console.error('GET /api/profile Error:', error);
    return NextResponse.json({ error: 'Gagal membaca profil' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const initialBalance = Number(body.initialBalance);
    const emergencyFundTarget = Number(body.emergencyFundTarget);
    if (
      !Number.isFinite(initialBalance) ||
      !Number.isFinite(emergencyFundTarget) ||
      emergencyFundTarget < 0
    ) {
      return NextResponse.json({ error: 'Nilai profil tidak valid' }, { status: 400 });
    }

    await query(
      `INSERT INTO public.profiles (id, initial_balance, emergency_fund_target, updated_at)
       VALUES ('global', $1, $2, now())
       ON CONFLICT (id) DO UPDATE
       SET initial_balance = EXCLUDED.initial_balance,
           emergency_fund_target = EXCLUDED.emergency_fund_target,
           updated_at = now()`,
      [initialBalance, emergencyFundTarget]
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PUT /api/profile Error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan profil' }, { status: 500 });
  }
}
