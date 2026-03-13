/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@prisma/adapter-libsql", "@libsql/client", "better-sqlite3", "@prisma/adapter-better-sqlite3"],
  },
};

export default nextConfig;
