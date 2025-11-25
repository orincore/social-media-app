import { DefaultSession, DefaultUser } from 'next-auth';

type AppUserFields = {
  id: string;
  username?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  birth_date?: string | null;
  bio?: string | null;
  onboarding_completed?: boolean;
  profile_complete?: boolean;
  missing_fields?: string[];
};

declare module 'next-auth' {
  interface Session {
    user?: DefaultSession['user'] & AppUserFields;
  }

  interface User extends DefaultUser {
    id: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
  }
}
