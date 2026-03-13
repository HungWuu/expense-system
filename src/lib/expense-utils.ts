// ---------- Types ----------

export interface ExpenseForm {
  date: string;
  item: string;
  type: string;
  details: string;
  transportation: string;
  route: string;
  tripType: string;
  amount: string;
  receipt: string;
  attachment: File | null;
}

export interface ExpenseData {
  amount: number;
  date: string | Date;
}

export const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "下書き", color: "bg-gray-100 text-gray-700" },
  submitted: { label: "提出済", color: "bg-blue-100 text-blue-700" },
  approved: { label: "承認済", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "却下", color: "bg-red-100 text-red-700" },
  settled: { label: "精算済", color: "bg-purple-100 text-purple-700" },
};

// ---------- Formatting ----------

export function formatYen(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

// ---------- Validation ----------

export function validateExpenseForm(form: ExpenseForm): Partial<Record<keyof ExpenseForm, string>> {
  const errors: Partial<Record<keyof ExpenseForm, string>> = {};

  if (!form.date) errors.date = "月日を入力してください";
  if (!form.item) errors.item = "精算項目を選択してください";
  if (!form.details) errors.details = "詳細を入力してください";
  if (!form.amount) {
    errors.amount = "金額を入力してください";
  } else if (Number(form.amount) <= 0) {
    errors.amount = "金額は1円以上で入力してください";
  }

  return errors;
}

// ---------- Summary Calculation ----------

export function calculateTodayTotal(expenses: ExpenseData[], now: Date = new Date()): number {
  const todayStr = now.toISOString().slice(0, 10);
  return expenses
    .filter((e) => {
      const d = e.date instanceof Date ? e.date : new Date(e.date);
      return d.toISOString().slice(0, 10) === todayStr;
    })
    .reduce((sum, e) => sum + e.amount, 0);
}

export function calculateMonthlyTotal(expenses: ExpenseData[], now: Date = new Date()): number {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  return expenses
    .filter((e) => {
      const d = e.date instanceof Date ? e.date : new Date(e.date);
      return d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth;
    })
    .reduce((sum, e) => sum + e.amount, 0);
}

export function calculateYearlyTotal(expenses: ExpenseData[], now: Date = new Date()): number {
  const currentYear = now.getFullYear();
  return expenses
    .filter((e) => {
      const d = e.date instanceof Date ? e.date : new Date(e.date);
      return d.getFullYear() === currentYear;
    })
    .reduce((sum, e) => sum + e.amount, 0);
}
