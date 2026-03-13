import type { NextAuthOptions } from "next-auth";
import type { Provider } from "next-auth/providers/index";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";

const providers: Provider[] = [
  AzureADProvider({
    clientId: process.env.AZURE_AD_CLIENT_ID!,
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
    tenantId: process.env.AZURE_AD_TENANT_ID!,
  }),
];

// E2Eテスト用: CredentialsProvider を追加
if (process.env.E2E_TEST === "true") {
  providers.push(
    CredentialsProvider({
      id: "credentials",
      name: "Test Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (
          credentials?.username === "test-user" &&
          credentials?.password === "test-pass"
        ) {
          return {
            id: "user-001",
            name: "テスト太郎",
            email: "taro@example.com",
          };
        }
        return null;
      },
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // 相対パスの場合は baseUrl と結合
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // 同一オリジンならそのまま許可
      if (url.startsWith(baseUrl)) return url;
      // デフォルトは /dashboard
      return `${baseUrl}/dashboard`;
    },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};
