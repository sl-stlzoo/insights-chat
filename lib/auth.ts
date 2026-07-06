import type { NextAuthOptions } from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';

function normalizeClaimList(value: unknown) {
  if (!value) {
    return [] as string[];
  }
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }
  if (typeof value === 'string') {
    return [value];
  }
  return [] as string[];
}

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID ?? '',
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET ?? '',
      tenantId: process.env.AZURE_AD_TENANT_ID ?? '',
      authorization: {
        params: {
          scope: 'openid profile email offline_access User.Read',
        },
      },
    }),
  ],
  pages: {
    signIn: '/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        const claims = profile as Record<string, unknown>;
        token.oid = typeof claims.oid === 'string' ? claims.oid : token.oid;
        token.roles = normalizeClaimList(claims.roles);
        token.groups = normalizeClaimList(claims.groups);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.oid = token.oid;
        session.user.roles = normalizeClaimList(token.roles);
        session.user.groups = normalizeClaimList(token.groups);
      }
      return session;
    },
  },
};
