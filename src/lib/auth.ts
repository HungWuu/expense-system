import type { NextAuthOptions } from "next-auth";
import type { Provider } from "next-auth/providers/index";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

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

      // DB の user.id を token に保持（未取得の場合は upsert で取得）
      console.log("[DEBUG jwt] token.dbUserId:", token.dbUserId, "token.sub:", token.sub, "token.email:", token.email);
      if (!token.dbUserId && token.sub && token.email) {
        console.log("[DEBUG jwt] dbUserId not set, upserting user...");
        try {
          const user = await prisma.user.upsert({
            where: { azureAdOid: token.sub },
            update: {
              name: token.name ?? "",
              email: token.email ?? "",
            },
            create: {
              azureAdOid: token.sub,
              employeeNumber: token.email ?? token.sub,
              name: token.name ?? "",
              email: token.email ?? "",
              department: "未設定",
            },
          });
          token.dbUserId = user.id;
          console.log("[DEBUG jwt] upserted user, dbUserId:", user.id);
        } catch (e) {
          console.error("[DEBUG jwt] user upsert failed:", e);
        }
      }
      return token;
    },
    async session({ session, token }) {
      // DB の id をセッションに設定（Azure AD の OID ではなく）
      if (token.dbUserId) {
        session.user.id = token.dbUserId as string;
      } else if (token.sub) {
        // E2Eテスト用フォールバック
        session.user.id = token.sub;
      }
      return session;
    },
  },
};
