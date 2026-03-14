import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/expenses - 経費一覧を取得
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const applicantId = searchParams.get("applicantId");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (applicantId) where.applicantId = applicantId;

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        applicant: { select: { id: true, name: true, email: true, department: true } },
        category: { select: { id: true, code: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error("GET /api/expenses error:", error);
    return NextResponse.json(
      { error: "経費一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST /api/expenses - 新しい経費データを登録
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // --- DEBUG: デバッグ情報を収集 ---
    const allUsers = await prisma.user.findMany({
      select: { id: true, azureAdOid: true, name: true, email: true },
    });
    const debug = {
      sessionUser: session.user,
      bodyApplicantId: body.applicantId,
      bodyCategoryId: body.categoryId,
      dbUsers: allUsers,
    };
    // --- END DEBUG ---

    const {
      applicantId,
      categoryId,
      title,
      description,
      amount,
      taxAmount,
      taxRate,
      date,
      vendor,
      receiptUrl,
      fiscalYear,
      fiscalMonth,
    } = body;

    // 必須フィールドのバリデーション
    if (!applicantId || !categoryId || !title || amount == null || !date || fiscalYear == null || fiscalMonth == null) {
      return NextResponse.json(
        { error: "必須項目が不足しています（applicantId, categoryId, title, amount, date, fiscalYear, fiscalMonth）", debug },
        { status: 400 }
      );
    }

    if (fiscalMonth < 1 || fiscalMonth > 12) {
      return NextResponse.json(
        { error: "fiscalMonth は 1〜12 の範囲で指定してください", debug },
        { status: 400 }
      );
    }

    // 申請者の存在チェック
    const applicant = await prisma.user.findUnique({ where: { id: applicantId } });
    if (!applicant) {
      return NextResponse.json(
        { error: `申請者が見つかりません（applicantId: ${applicantId}）`, debug },
        { status: 400 }
      );
    }

    // カテゴリの存在チェック
    const category = await prisma.expenseCategory.findUnique({ where: { id: categoryId } });
    if (!category) {
      return NextResponse.json(
        { error: `経費カテゴリが見つかりません（categoryId: ${categoryId}）` },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.create({
      data: {
        applicantId,
        categoryId,
        title,
        description: description ?? null,
        amount,
        taxAmount: taxAmount ?? 0,
        taxRate: taxRate ?? 10.0,
        date: new Date(date),
        vendor: vendor ?? null,
        receiptUrl: receiptUrl ?? null,
        fiscalYear,
        fiscalMonth,
      },
      include: {
        applicant: { select: { id: true, name: true, email: true, department: true } },
        category: { select: { id: true, code: true, name: true } },
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("POST /api/expenses error:", error);
    return NextResponse.json(
      { error: "経費データの登録に失敗しました" },
      { status: 500 }
    );
  }
}
