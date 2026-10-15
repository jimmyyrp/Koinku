import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface MongoCreds {
  username: string;
  password: string;
}

// Ambil kredensial default dari MONGODB_URI (koinku_db_user)
function getExpectedCreds(): MongoCreds | null {
  const uri = process.env.MONGODB_URI || '';
  const match = uri.match(/^mongodb(\+srv)?:\/\/([^:@]+):([^@]+)@/);
  if (!match) return null;
  return {
    username: decodeURIComponent(match[2]),
    password: decodeURIComponent(match[3]),
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = String(body.username ?? '').trim();
    const password = String(body.password ?? '');

    if (!username || !password) {
      return NextResponse.json(
        { ok: false, error: 'Username dan password wajib diisi' },
        { status: 400 }
      );
    }

    const expected = getExpectedCreds();
    if (!expected) {
      return NextResponse.json(
        { ok: false, error: 'Kredensial database belum dikonfigurasi' },
        { status: 500 }
      );
    }

    if (username === expected.username && password === expected.password) {
      return NextResponse.json({ ok: true, username });
    }

    return NextResponse.json(
      { ok: false, error: 'Username atau password salah' },
      { status: 401 }
    );
  } catch (err) {
    console.error('POST /api/auth/login Error:', err);
    return NextResponse.json({ ok: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}