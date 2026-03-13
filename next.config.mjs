/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@prisma/adapter-libsql", "@libsql/client"],
  },
};

export default nextConfig;
