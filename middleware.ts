export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    '/',
    '/mash/:path*',
    '/maude/:path*',
    '/quacker/:path*',
    '/all-the-quackers/:path*',
    '/api/chat',
    '/api/db',
    '/api/dives/:path*',
    '/api/suggestions',
  ],
};
