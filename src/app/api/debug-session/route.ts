import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);

  // DB の users テーブルも確認
  const userCount = await prisma.user.count();
  const users = await prisma.user.findMany({
    select: { id: true, azureAdOid: true, name: true, email: true },
  });

  return NextResponse.json({
    session,
    dbUserCount: userCount,
    dbUsers: users,
  });
}
