/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@muix/agent',
    '@muix/capability',
    '@muix/core',
    '@muix/devtools',
    '@muix/motion',
    '@muix/react',
  ],
};

export default nextConfig;
