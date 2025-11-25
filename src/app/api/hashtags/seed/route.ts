import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Sample hashtags to seed
    const sampleHashtags = [
      { name: 'technology', posts_count: 1250 },
      { name: 'javascript', posts_count: 890 },
      { name: 'react', posts_count: 756 },
      { name: 'nextjs', posts_count: 432 },
      { name: 'programming', posts_count: 2100 },
      { name: 'webdev', posts_count: 1680 },
      { name: 'coding', posts_count: 1420 },
      { name: 'typescript', posts_count: 567 },
      { name: 'nodejs', posts_count: 445 },
      { name: 'frontend', posts_count: 890 },
      { name: 'backend', posts_count: 678 },
      { name: 'fullstack', posts_count: 345 },
      { name: 'ai', posts_count: 1890 },
      { name: 'machinelearning', posts_count: 1234 },
      { name: 'blockchain', posts_count: 567 },
      { name: 'crypto', posts_count: 789 },
      { name: 'startup', posts_count: 1456 },
      { name: 'business', posts_count: 2345 },
      { name: 'marketing', posts_count: 1678 },
      { name: 'design', posts_count: 1890 }
    ];

    // Insert hashtags using upsert to avoid duplicates
    const { data, error } = await adminClient
      .from('hashtags')
      .upsert(
        sampleHashtags.map(hashtag => ({
          ...hashtag,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })),
        { onConflict: 'name' }
      );

    if (error) {
      console.error('Error seeding hashtags:', error);
      return NextResponse.json({ error: 'Failed to seed hashtags' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Seeded ${sampleHashtags.length} hashtags`,
      hashtags: sampleHashtags.length
    });

  } catch (error) {
    console.error('Error in hashtag seeding:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
