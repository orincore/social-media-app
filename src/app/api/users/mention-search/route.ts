import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.length < 1) {
      return NextResponse.json({ users: [] });
    }

    console.log('👤 Searching for users with query:', query);

    // Search for users by username or display name
    const { data: users, error } = await adminClient
      .from('users')
      .select('id, username, display_name, avatar_url, is_verified')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .neq('id', session.user.id) // Exclude current user
      .order('username', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error searching users:', error);
      return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
    }

    console.log('👥 Found users:', users);

    // Format users for autocomplete
    const formattedUsers = users?.map(user => ({
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      is_verified: user.is_verified,
      display: `@${user.username}`,
      value: user.username,
      label: `${user.display_name} (@${user.username})`
    })) || [];

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error('Error in user mention search:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
