import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/supabase-db';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type ProfileRow = {
  initial_balance: string;
  emergency_fund_target: string;
  monthly_income: string;
  payday: number;
  has_installments: boolean;
  emergency_fund_balance: string;
  data_reset_at: Date;
};

export async function GET(req: NextRequest) {
  try {
    const { rows } = await query<ProfileRow>(
      `SELECT initial_balance, emergency_fund_target, monthly_income, payday,
              has_installments, emergency_fund_balance, data_reset_at
       FROM public.profiles
       WHERE id = 'global'`
    );
    const profile = rows[0];
    return NextResponse.json({
      profile: {
        initialBalance: Number(profile?.initial_balance ?? 0),
        emergencyFundTarget: Number(profile?.emergency_fund_target ?? 20000000),
        monthlyIncome: Number(profile?.monthly_income ?? 3300000),
        payday: Number(profile?.payday ?? 28),
        hasInstallments: Boolean(profile?.has_installments),
        emergencyFundBalance: Number(profile?.emergency_fund_balance ?? 0),
        dataResetAt: profile?.data_reset_at
          ? new Date(profile.data_reset_at).toISOString()
          : null,
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
    const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);
    const toNumber = (value: unknown) => {
      if (value === undefined || value === null || value === '') return undefined;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : NaN;
    };

    const initialBalance = toNumber(has('initialBalance') ? body.initialBalance : undefined);
    const emergencyFundTarget = toNumber(
      has('emergencyFundTarget') ? body.emergencyFundTarget : undefined
    );
    const monthlyIncome = toNumber(has('monthlyIncome') ? body.monthlyIncome : undefined);
    const emergencyFundBalance = toNumber(
      has('emergencyFundBalance') ? body.emergencyFundBalance : undefined
    );
    const payday = toNumber(has('payday') ? body.payday : undefined);
    const hasInstallments = has('hasInstallments') ? body.hasInstallments : undefined;

    if (
      Number.isNaN(initialBalance) ||
      Number.isNaN(emergencyFundTarget) ||
      Number.isNaN(monthlyIncome) ||
      Number.isNaN(emergencyFundBalance) ||
      Number.isNaN(payday)
    ) {
      return NextResponse.json({ error: 'Nilai profil tidak valid' }, { status: 400 });
    }
    if (
      (emergencyFundTarget !== undefined && emergencyFundTarget < 0) ||
      (monthlyIncome !== undefined && monthlyIncome < 0) ||
      (emergencyFundBalance !== undefined && emergencyFundBalance < 0)
    ) {
      return NextResponse.json({ error: 'Nilai profil tidak boleh negatif' }, { status: 400 });
    }
    if (payday !== undefined && (!Number.isInteger(payday) || payday < 1 || payday > 31)) {
      return NextResponse.json({ error: 'Tanggal gajian harus 1-31' }, { status: 400 });
    }
    if (hasInstallments !== undefined && typeof hasInstallments !== 'boolean') {
      return NextResponse.json({ error: 'Status cicilan tidak valid' }, { status: 400 });
    }
    if (
      initialBalance === undefined &&
      emergencyFundTarget === undefined &&
      monthlyIncome === undefined &&
      emergencyFundBalance === undefined &&
      payday === undefined &&
      hasInstallments === undefined
    ) {
      return NextResponse.json({ error: 'Tidak ada data profil untuk disimpan' }, { status: 400 });
    }

    await query(
      `INSERT INTO public.profiles (
         id, initial_balance, emergency_fund_target, monthly_income, payday,
         has_installments, emergency_fund_balance, updated_at
       )
       VALUES (
         'global',
         COALESCE($1::numeric, 0),
         COALESCE($2::numeric, 20000000),
         COALESCE($3::numeric, 3300000),
         COALESCE($4::smallint, 28),
         COALESCE($5::boolean, false),
         COALESCE($6::numeric, 0),
         now()
       )
       ON CONFLICT (id) DO UPDATE
       SET initial_balance = COALESCE($1::numeric, public.profiles.initial_balance),
           emergency_fund_target = COALESCE($2::numeric, public.profiles.emergency_fund_target),
           monthly_income = COALESCE($3::numeric, public.profiles.monthly_income),
           payday = COALESCE($4::smallint, public.profiles.payday),
           has_installments = COALESCE($5::boolean, public.profiles.has_installments),
           emergency_fund_balance = COALESCE($6::numeric, public.profiles.emergency_fund_balance),
           updated_at = now()`,
      [
        initialBalance ?? null,
        emergencyFundTarget ?? null,
        monthlyIncome ?? null,
        payday ?? null,
        hasInstallments ?? null,
        emergencyFundBalance ?? null,
      ]
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PUT /api/profile Error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan profil' }, { status: 500 });
  }
}
