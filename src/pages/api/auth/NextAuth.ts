import NextAuth from 'next-auth';
import type { NextAuthOptions, Account, Profile } from 'next-auth';
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

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID || '',
      clientSecret: process.env.GOOGLE_SECRET || ''
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_ID || '',
      clientSecret: process.env.FACEBOOK_SECRET || ''
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }): Promise<boolean> {
      const acc = account as BackendAccount | null;
      const prof = profile as BackendProfile | null;
      if (!acc || !prof) return true;

      if (acc.provider === 'google') {
        try {
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/google-login`,
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
            return true;
          }
          return false;
        } catch (err) {

          return false;
        }
      }

      if (acc.provider === 'facebook') {
        try {
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/facebook-login`,
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
          return false;
        } catch (err) {

          return false;
        }
      }
      // Reference `user` to satisfy noUnusedParameters style
      void user;
      return true;
    },
    async jwt({ token, account }): Promise<typeof token> {
      const acc = account as BackendAccount | null;
      if (acc && (acc.provider === 'google' || acc.provider === 'facebook') && acc.backendToken) {
        token.backendToken = acc.backendToken;
        token.backendUser = acc.backendUser;
      }
      return token;
    },
    async session({ session, token }): Promise<typeof session> {
      const t = token as typeof token & { backendToken?: string; backendUser?: BackendUser };
      if (t.backendToken) {
        (session as typeof session & { backendToken?: string }).backendToken = t.backendToken;
        if (t.backendUser) {
          session.user = { ...session.user, ...(t.backendUser as Record<string, unknown>) } as typeof session.user;
        }
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/login'
  },
  debug: process.env.NEXTAUTH_DEBUG === 'true',
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-here'
};

export default NextAuth(authOptions);
