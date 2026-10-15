import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

interface ProfileDoc {
  _id: string;
  initialBalance: number;
  emergencyFundTarget: number;
  updatedAt?: string;
}

export async function GET() {
  try {
    const db = await getDb();
    const coll = db.collection<ProfileDoc>('profiles');
    const profile = await coll.findOne({ _id: 'global' });
    return NextResponse.json({
      profile: {
        initialBalance: profile?.initialBalance ?? 0,
        emergencyFundTarget: profile?.emergencyFundTarget ?? 20000000,
      },
    });
  } catch (err) {
    console.error('GET /api/profile Error:', err);
    return NextResponse.json({ error: 'Gagal membaca profil' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const initialBalance = Number(body.initialBalance ?? 0);
    const emergencyFundTarget = Number(body.emergencyFundTarget ?? 20000000);

    const db = await getDb();
    const coll = db.collection<ProfileDoc>('profiles');
    await coll.updateOne(
      { _id: 'global' },
      {
        $set: {
          initialBalance,
          emergencyFundTarget,
          updatedAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/profile Error:', err);
    return NextResponse.json({ error: 'Gagal menyimpan profil' }, { status: 500 });
  }
}