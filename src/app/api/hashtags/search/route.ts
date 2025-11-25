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
      return NextResponse.json({ hashtags: [] });
    }

    console.log('🔍 Searching for hashtags with query:', query);

    // Search for hashtags that start with or contain the query
    const { data: hashtags, error } = await adminClient
      .from('hashtags')
      .select('name, posts_count')
      .ilike('name', `%${query.toLowerCase()}%`)
      .order('posts_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error searching hashtags:', error);
      return NextResponse.json({ error: 'Failed to search hashtags' }, { status: 500 });
    }

    console.log('📊 Found hashtags:', hashtags);

    // Format hashtags for autocomplete
    const formattedHashtags = hashtags?.map(hashtag => ({
      name: hashtag.name,
      posts_count: hashtag.posts_count,
      display: `#${hashtag.name}`,
      value: hashtag.name
    })) || [];

    return NextResponse.json({ hashtags: formattedHashtags });
  } catch (error) {
    console.error('Error in hashtag search:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
