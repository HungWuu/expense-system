/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@prisma/adapter-libsql", "@libsql/client"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("@prisma/adapter-libsql", "@libsql/client");
    }
    return config;
  },
};

export default nextConfig;
