/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/:path((?!api/|_next/).*)',
        has: [{ type: 'host', value: 'myclient.verilex.us' }],
        destination: '/myclient/:path*',
      },
    ];
  },
};

export default nextConfig;
