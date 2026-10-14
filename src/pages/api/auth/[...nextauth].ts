/**
 * @file pages/api/auth/[...nextauth].ts
 * @description Canonical NextAuth catch-all route. Provides Google & Facebook
 * OAuth with backend token bridging and avatar enrichment.
 */
import NextAuth from 'next-auth';
import type { NextAuthOptions, Account, Profile, Session } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import axios from 'axios';

interface BackendUser {
  _id?: string;
  id?: string;
  role?: string;
  avatar?: string;
  [key: string]: unknown;
}

interface BackendAccount extends Account {
  backendToken?: string;
  backendUser?: BackendUser;
}

interface BackendProfile extends Profile {
  sub?: string;
  picture?: string;
  id?: string;
}

interface AugmentedToken {
  backendToken?: string;
  backendUser?: BackendUser;
  picture?: string;
  [key: string]: unknown;
}

interface AugmentedSession extends Session {
  backendToken?: string;
}

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'select_account',
          access_type: 'offline',
          response_type: 'code'
        }
      }
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_ID || '',
      clientSecret: process.env.FACEBOOK_SECRET || ''
    })
  ],
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account, profile }): Promise<boolean> {
      const acc = account as BackendAccount | null;
      const prof = profile as BackendProfile | null;
      if (!acc || !prof) return true;

      if (acc.provider === 'google') {
        try {
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/google-login`,
            {
              email: prof.email,
              name: prof.name,
              googleId: prof.sub,
              picture: prof.picture
            }
          );
          const data = response.data as { token?: string; user?: BackendUser };
          if (data?.token) {
            acc.backendToken = data.token;
            acc.backendUser = data.user;
            if (acc.backendUser && !acc.backendUser.avatar && prof.picture) {
              acc.backendUser.avatar = prof.picture;
            }
            return true;
          }
          console.error('Backend response invalid:', response.data);
          return false;
        } catch (err) {
          const e = err as { response?: { data?: unknown }; message?: string };
          console.error('Error with Google login backend:', e.response?.data || e.message);
          return false;
        }
      }

      if (acc.provider === 'facebook') {
        try {
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/facebook-login`,
            {
              email: prof.email,
              name: prof.name,
              facebookId: prof.id,
              picture: (prof as unknown as { picture?: { data?: { url?: string } } }).picture?.data?.url
            }
          );
          const data = response.data as { token?: string; user?: BackendUser };
          if (data?.token) {
            acc.backendToken = data.token;
            acc.backendUser = data.user;
            return true;
          }
          console.error('Backend response invalid:', response.data);
          return false;
        } catch (err) {
          const e = err as { response?: { data?: unknown }; message?: string };
          console.error('Error with Facebook login backend:', e.response?.data || e.message);
          return false;
        }
      }
      void user;
      return true;
    },
    async jwt({ token, account, profile }): Promise<typeof token> {
      const acc = account as BackendAccount | null;
      const prof = profile as BackendProfile | null;
      const tk = token as typeof token & AugmentedToken;
      if (acc && (acc.provider === 'google' || acc.provider === 'facebook')) {
        if (acc.backendToken) {
          tk.backendToken = acc.backendToken;
          tk.backendUser = acc.backendUser;
          if (acc.provider === 'google' && prof?.picture && (!tk.backendUser?.avatar || tk.backendUser.avatar === '')) {
            if (tk.backendUser) tk.backendUser.avatar = prof.picture;
            tk.picture = prof.picture;
          }
        }
      }
      return tk;
    },
    async session({ session, token }): Promise<Session> {
      const tk = token as typeof token & AugmentedToken;
      const ses = session as AugmentedSession;
      if (tk.backendToken) {
        ses.backendToken = tk.backendToken;
        if (tk.backendUser) {
          const id = tk.backendUser._id || tk.backendUser.id;
          const merged = {
            ...ses.user,
            ...(tk.backendUser as Record<string, unknown>),
            id,
            _id: id,
            role: tk.backendUser.role || 'user'
          } as Record<string, unknown> & { avatar?: string; image?: string };
          if (!merged.avatar && merged.image) merged.avatar = merged.image;
          if (!merged.avatar && tk.picture) merged.avatar = tk.picture;
          ses.user = merged as Session['user'];
        }
      }
      return ses;
    }
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error'
  }
};

export default NextAuth(authOptions);
