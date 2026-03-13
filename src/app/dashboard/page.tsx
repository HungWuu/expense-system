import { prisma } from "@/lib/prisma";
import { ExpenseList } from "@/components/ExpenseList";
import {
  calculateTodayTotal,
  calculateMonthlyTotal,
  calculateYearlyTotal,
} from "@/lib/expense-utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const expenses = await prisma.expense.findMany({
    include: {
      applicant: { select: { id: true, name: true, email: true, department: true } },
      category: { select: { id: true, code: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const categories = await prisma.expenseCategory.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
  });

  // 合計金額を算出（当日 / 当月 / 当年）
  const now = new Date();
  const todayTotal = calculateTodayTotal(expenses, now);
  const monthlyTotal = calculateMonthlyTotal(expenses, now);
  const yearlyTotal = calculateYearlyTotal(expenses, now);

  // Date を文字列にシリアライズして Client Component に渡す
  const serialized = expenses.map((e) => ({
    ...e,
    date: e.date.toISOString(),
    approvedAt: e.approvedAt?.toISOString() ?? null,
    submittedAt: e.submittedAt?.toISOString() ?? null,
    settledAt: e.settledAt?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));

  return (
    <ExpenseList
      expenses={serialized}
      categories={categories.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
      }))}
      summary={{ todayTotal, monthlyTotal, yearlyTotal }}
    />
  );
}
