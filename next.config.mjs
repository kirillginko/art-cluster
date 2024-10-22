/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nrs.harvard.edu',
        pathname: '/**',
      }
    ]
  }
};
export default nextConfig;
