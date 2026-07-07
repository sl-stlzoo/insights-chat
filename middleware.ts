export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    '/',
    '/zd/:path*',
    '/insights-chat/:path*',
    '/quacker/:path*',
    '/all-the-quackers/:path*',
    '/api/chat',
    '/api/db',
    '/api/dives/:path*',
    '/api/suggestions',
  ],
};
