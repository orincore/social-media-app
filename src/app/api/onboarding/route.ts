import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// GET - Check if username is available
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json({ 
        available: false, 
        error: 'Username must be 3-20 characters, letters, numbers, and underscores only' 
      });
    }

    // Check if username exists
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id')
      .eq('username', username.toLowerCase())
      .single();

    return NextResponse.json({ 
      available: !existingUser,
      username: username.toLowerCase()
    });
  } catch (error) {
    console.error('Username check error:', error);
    return NextResponse.json({ available: true }); // Assume available on error
  }
}

// POST - Complete onboarding
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const { username, display_name, bio, location, website, gender, birth_date, avatar_url } =
      body as {
        username: string;
        display_name: string;
        bio?: string | null;
        location?: string | null;
        website?: string | null;
        gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
        birth_date?: string | null;
        avatar_url?: string | null;
      };

    // Validate username
    if (!username || username.trim().length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
    }

    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json({ 
        error: 'Username must be 3-20 characters, letters, numbers, and underscores only' 
      }, { status: 400 });
    }

    // Validate display name
    if (!display_name || display_name.trim().length < 1) {
      return NextResponse.json({ error: 'Display name is required' }, { status: 400 });
    }

    // Validate gender (required)
    const validGenders = ['male', 'female', 'other', 'prefer_not_to_say'];
    if (!gender || !validGenders.includes(gender)) {
      return NextResponse.json({ error: 'Please select a valid gender option' }, { status: 400 });
    }

    // Validate birth date (required)
    if (!birth_date) {
      return NextResponse.json({ error: 'Date of birth is required' }, { status: 400 });
    }

    // Check age (must be at least 13)
    const birthDateObj = new Date(birth_date);
    const today = new Date();
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const monthDiff = today.getMonth() - birthDateObj.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    if (age < 13) {
      return NextResponse.json({ error: 'You must be at least 13 years old to use this app' }, { status: 400 });
    }

    const normalizedUsername = username.toLowerCase();

    // Check if username is already taken by another user
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id, email')
      .eq('username', normalizedUsername)
      .single();

    if (existingUser && existingUser.email !== session.user.email) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 400 });
    }

    // Get current user to check if they have an avatar from OAuth
    const { data: currentUser } = await adminClient
      .from('users')
      .select('avatar_url')
      .eq('email', session.user.email)
      .single();

    // Use provided avatar_url, or keep existing OAuth avatar if no new one provided
    const finalAvatarUrl = avatar_url || currentUser?.avatar_url || null;

    // Validate avatar is present (required)
    if (!finalAvatarUrl || finalAvatarUrl.trim() === '') {
      return NextResponse.json({ 
        error: 'Profile picture is required. Please upload an image or use your Google profile picture.' 
      }, { status: 400 });
    }

    const { error } = await adminClient
      .from('users')
      .update({
        username: normalizedUsername,
        display_name: display_name.trim(),
        bio: bio?.trim() || null,
        location: location?.trim() || null,
        website: website?.trim() || null,
        gender: gender,
        birth_date: birth_date,
        avatar_url: finalAvatarUrl,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('email', session.user.email);

    if (error) {
      console.error('Onboarding API error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, username: normalizedUsername, avatar_url: finalAvatarUrl });
  } catch (error) {
    console.error('Onboarding API unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
