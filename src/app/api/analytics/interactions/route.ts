import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// POST - Track user interaction
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      post_id, 
      interaction_type, // 'like', 'repost', 'comment', 'view', 'time_spent'
      metadata = {} // Additional data like time_spent_seconds, hashtags, etc.
    } = body;

    if (!post_id || !interaction_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get post details for analysis
    const { data: post } = await adminClient
      .from('posts')
      .select('hashtags, mentions, media_urls, user_id')
      .eq('id', post_id)
      .single();

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Record the interaction
    const { error } = await adminClient
      .from('user_interactions')
      .insert({
        user_id: session.user.id,
        post_id,
        interaction_type,
        post_hashtags: post.hashtags || [],
        post_mentions: post.mentions || [],
        has_media: post.media_urls && post.media_urls.length > 0,
        post_author_id: post.user_id,
        metadata,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error recording interaction:', error);
      return NextResponse.json({ error: 'Failed to record interaction' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in POST /api/analytics/interactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Get user interaction analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get user's interaction patterns
    const { data: interactions } = await adminClient
      .from('user_interactions')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (!interactions) {
      return NextResponse.json({ interactions: [], analytics: {} });
    }

    // Analyze interaction patterns
    const analytics = {
      total_interactions: interactions.length,
      interaction_types: {},
      popular_hashtags: {},
      media_preference: {
        with_media: 0,
        without_media: 0
      },
      engagement_score: 0
    };

    // Calculate analytics
    interactions.forEach(interaction => {
      // Count interaction types
      analytics.interaction_types[interaction.interaction_type] = 
        (analytics.interaction_types[interaction.interaction_type] || 0) + 1;

      // Count hashtag preferences
      if (interaction.post_hashtags) {
        interaction.post_hashtags.forEach(hashtag => {
          analytics.popular_hashtags[hashtag] = 
            (analytics.popular_hashtags[hashtag] || 0) + 1;
        });
      }

      // Media preference
      if (interaction.has_media) {
        analytics.media_preference.with_media++;
      } else {
        analytics.media_preference.without_media++;
      }
    });

    // Calculate engagement score (weighted by interaction type)
    const weights = { like: 1, repost: 3, comment: 5, view: 0.1, time_spent: 2 };
    analytics.engagement_score = interactions.reduce((score, interaction) => {
      return score + (weights[interaction.interaction_type] || 0);
    }, 0);

    return NextResponse.json({ interactions, analytics });

  } catch (error) {
    console.error('Error in GET /api/analytics/interactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
