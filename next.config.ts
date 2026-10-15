import path from 'node:path';
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // Kunci root proyek agar Next tidak salah mendeteksi workspace (ada pnpm-lock di folder induk)
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
