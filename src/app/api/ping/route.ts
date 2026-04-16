import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';

// GET /api/ping - Lightweight DB ping for uptime monitoring
export async function GET() {
  try {
    const { error } = await adminClient
      .from('users')
      .select('id')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, timestamp: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
