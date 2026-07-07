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
      async profile(profile, tokens) {
        let image = null;
        if (tokens.access_token) {
          try {
            const res = await fetch('https://graph.microsoft.com/v1.0/me/photos/48x48/$value', {
              headers: { Authorization: `Bearer ${tokens.access_token}` },
            });
            if (res.ok) {
              const buffer = await res.arrayBuffer();
              // Prevent 431 Request Header Fields Too Large by ensuring the image is small enough
              // (NextAuth stores this in the JWT cookie). 48x48 should be < 2KB.
              if (buffer.byteLength < 5000) {
                const base64 = Buffer.from(buffer).toString('base64');
                image = `data:${res.headers.get('content-type')};base64,${base64}`;
              } else {
                console.warn(`Profile photo too large for cookie (${buffer.byteLength} bytes). Skipping.`);
              }
            }
          } catch (e) {
            console.error('Error fetching profile photo:', e);
          }
        }
        return {
          id: profile.sub || profile.oid,
          name: profile.name,
          email: profile.email || profile.preferred_username,
          image: image,
        };
      }
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
