/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/signin',
        destination: '/login',
      },
    ];
  },
};

export default nextConfig;
