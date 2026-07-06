/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/tab/explorer',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors https://teams.microsoft.com https://*.teams.microsoft.com https://*.sharepoint.com; frame-src https://*.motherduck.com;",
          },
          {
            key: 'X-Frame-Options',
            value: 'ALLOW-FROM https://teams.microsoft.com',
          },
        ],
      },
    ];
  },
  async rewrites() {
    const docsOrigin = process.env.DOCS_PROXY_ORIGIN || 'http://127.0.0.1:4321';

    return [
      {
        source: '/docs',
        destination: `${docsOrigin}/`,
      },
      {
        source: '/docs/:path*',
        destination: `${docsOrigin}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
