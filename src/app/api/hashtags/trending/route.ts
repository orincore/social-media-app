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
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get trending hashtags ordered by posts_count and recent activity
    const { data: hashtags, error } = await adminClient
      .from('hashtags')
      .select('name, posts_count, updated_at')
      .order('posts_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching trending hashtags:', error);
      return NextResponse.json({ error: 'Failed to fetch trending hashtags' }, { status: 500 });
    }

    // Format hashtags for display
    const formattedHashtags = hashtags?.map((hashtag, index) => ({
      id: hashtag.name,
      name: hashtag.name,
      posts_count: hashtag.posts_count,
      rank: index + 1,
      display: `#${hashtag.name}`,
      category: 'Trending', // Could be enhanced with actual categorization
      updated_at: hashtag.updated_at
    })) || [];

    return NextResponse.json({ hashtags: formattedHashtags });
  } catch (error) {
    console.error('Error in trending hashtags:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
