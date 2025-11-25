import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { adminClient } from '@/lib/supabase/admin';
import type { Tables, TablesInsert } from '@/lib/supabase/types';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile',
        },
      },
      // Get full profile including first and last name
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name || `${profile.given_name || ''} ${profile.family_name || ''}`.trim(),
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          // Aggressively get avatar URL from multiple sources
          const googleProfile = profile as { picture?: string; image?: string } | undefined;
          const avatarUrl = user.image || googleProfile?.picture || googleProfile?.image || null;
          
          console.log('OAuth profile data:', {
            email: user.email,
            name: user.name,
            userImage: user.image,
            profilePicture: googleProfile?.picture,
            finalAvatarUrl: avatarUrl
          });

          // Use admin client so RLS does not block user bootstrap
          const { data: existingUser } = await adminClient
            .from('users')
            .select('*')
            .eq('email', user.email!)
            .single();

          if (!existingUser) {
            // FIRST TIME LOGIN: Create new user record with OAuth profile data
            // Generate a unique temporary username to avoid duplicate key errors
            // Users will set their real username during onboarding
            const tempUsername = `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
            
            const payload: TablesInsert<'users'> = {
              email: user.email!,
              username: tempUsername, // Temporary unique username, set properly during onboarding
              display_name: user.name || '',
              avatar_url: avatarUrl, // Aggressively capture OAuth profile picture
              onboarding_completed: false,
            };

            const { error } = await adminClient.from('users').insert(payload);

            if (error) {
              console.error('Error creating user:', error);
              return false;
            }
            
            console.log('New user created with OAuth data:', {
              email: user.email,
              display_name: user.name,
              avatar_url: avatarUrl || 'NONE - WILL REQUIRE UPLOAD'
            });
          } else {
            // RETURNING USER: If avatar_url is empty in DB but OAuth has one, update it
            if (!existingUser.avatar_url && avatarUrl) {
              console.log('Updating missing avatar_url for existing user');
              await adminClient
                .from('users')
                .update({ avatar_url: avatarUrl })
                .eq('id', existingUser.id);
            }
            console.log('Existing user logged in:', existingUser.email, 'avatar:', existingUser.avatar_url || avatarUrl || 'NONE');
          }

          return true;
        } catch (error) {
          console.error('Sign in error:', error);
          return false;
        }
      }
      return true;
    },
    async session({ session }) {
      if (session.user) {
        try {
          const { data: userData } = await adminClient
            .from('users')
            .select('*')
            .eq('email', session.user.email!)
            .single();

          if (userData) {
            const typedUser = userData as Tables<'users'>;
            
            // Check which required fields are missing
            const missingFields: string[] = [];
            if (!typedUser.username || typedUser.username.trim() === '') {
              missingFields.push('username');
            }
            if (!typedUser.gender) {
              missingFields.push('gender');
            }
            if (!typedUser.birth_date) {
              missingFields.push('birth_date');
            }
            // Avatar is required - must have OAuth picture or uploaded one
            if (!typedUser.avatar_url || typedUser.avatar_url.trim() === '') {
              missingFields.push('avatar');
            }
            
            // Profile is complete only if all required fields are filled (including avatar)
            const isProfileComplete = missingFields.length === 0 && typedUser.onboarding_completed;
            
            // Get avatar - prefer DB, fallback to OAuth session
            const avatarUrl = typedUser.avatar_url || session.user.image || null;
            
            // Use database values, not OAuth values (preserves user's custom settings)
            session.user = {
              ...session.user,
              id: typedUser.id,
              name: typedUser.display_name || session.user.name,
              image: avatarUrl,
              username: typedUser.username,
              gender: typedUser.gender,
              birth_date: typedUser.birth_date,
              bio: typedUser.bio,
              onboarding_completed: typedUser.onboarding_completed,
              profile_complete: isProfileComplete,
              missing_fields: missingFields,
            };
          }
        } catch (error) {
          console.error('Session callback error:', error);
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
