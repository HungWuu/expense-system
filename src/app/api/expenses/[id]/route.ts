import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: { id: string } };

// GET /api/expenses/[id] - 特定の経費データを取得
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  try {
    const { id } = params;

    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        applicant: { select: { id: true, name: true, email: true, department: true } },
        approver: { select: { id: true, name: true, email: true, department: true } },
        category: { select: { id: true, code: true, name: true } },
      },
    });

    if (!expense) {
      return NextResponse.json(
        { error: "指定された経費データが見つかりません" },
        { status: 404 }
      );
    }

    return NextResponse.json(expense);
  } catch (error) {
    console.error(`GET /api/expenses/${params.id} error:`, error);
    return NextResponse.json(
      { error: "経費データの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// PUT /api/expenses/[id] - 既存の経費データを更新
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  try {
    const { id } = params;

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "指定された経費データが見つかりません" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const {
      categoryId,
      title,
      description,
      amount,
      taxAmount,
      taxRate,
      date,
      vendor,
      receiptUrl,
      status,
      approverId,
      approvedAt,
      rejectionReason,
      submittedAt,
      settledAt,
      fiscalYear,
      fiscalMonth,
    } = body;

    if (fiscalMonth !== undefined && (fiscalMonth < 1 || fiscalMonth > 12)) {
      return NextResponse.json(
        { error: "fiscalMonth は 1〜12 の範囲で指定してください" },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};
    if (categoryId !== undefined) data.categoryId = categoryId;
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (amount !== undefined) data.amount = amount;
    if (taxAmount !== undefined) data.taxAmount = taxAmount;
    if (taxRate !== undefined) data.taxRate = taxRate;
    if (date !== undefined) data.date = new Date(date);
    if (vendor !== undefined) data.vendor = vendor;
    if (receiptUrl !== undefined) data.receiptUrl = receiptUrl;
    if (status !== undefined) data.status = status;
    if (approverId !== undefined) data.approverId = approverId;
    if (approvedAt !== undefined) data.approvedAt = approvedAt ? new Date(approvedAt) : null;
    if (rejectionReason !== undefined) data.rejectionReason = rejectionReason;
    if (submittedAt !== undefined) data.submittedAt = submittedAt ? new Date(submittedAt) : null;
    if (settledAt !== undefined) data.settledAt = settledAt ? new Date(settledAt) : null;
    if (fiscalYear !== undefined) data.fiscalYear = fiscalYear;
    if (fiscalMonth !== undefined) data.fiscalMonth = fiscalMonth;

    const expense = await prisma.expense.update({
      where: { id },
      data,
      include: {
        applicant: { select: { id: true, name: true, email: true, department: true } },
        approver: { select: { id: true, name: true, email: true, department: true } },
        category: { select: { id: true, code: true, name: true } },
      },
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error(`PUT /api/expenses/${params.id} error:`, error);
    return NextResponse.json(
      { error: "経費データの更新に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE /api/expenses/[id] - 指定した経費データを削除
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  try {
    const { id } = params;

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "指定された経費データが見つかりません" },
        { status: 404 }
      );
    }

    await prisma.expense.delete({ where: { id } });

    return NextResponse.json({ message: "経費データを削除しました" });
  } catch (error) {
    console.error(`DELETE /api/expenses/${params.id} error:`, error);
    return NextResponse.json(
      { error: "経費データの削除に失敗しました" },
      { status: 500 }
    );
  }
}
