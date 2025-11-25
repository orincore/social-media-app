import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// GET - Search users for messaging
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ users: [] });
    }

    // Search users by username or display name
    const { data: users, error } = await adminClient
      .from('users')
      .select('id, username, display_name, avatar_url, is_verified')
      .neq('id', session.user.id) // Exclude current user
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(limit);

    if (error) {
      console.error('Error searching users:', error);
      return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
    }

    return NextResponse.json({ users: users || [] });

  } catch (error) {
    console.error('Error in GET /api/users/search:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
