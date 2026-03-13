import { describe, it, expect } from "vitest";
import {
  formatYen,
  formatDate,
  validateExpenseForm,
  calculateTodayTotal,
  calculateMonthlyTotal,
  calculateYearlyTotal,
  STATUS_LABELS,
  type ExpenseForm,
  type ExpenseData,
} from "../expense-utils";

// ---------- formatYen ----------

describe("formatYen", () => {
  it("0円をフォーマットする", () => {
    expect(formatYen(0)).toBe("¥0");
  });

  it("正の金額をカンマ区切りでフォーマットする", () => {
    expect(formatYen(1000)).toBe("¥1,000");
    expect(formatYen(1234567)).toBe("¥1,234,567");
  });

  it("小さい金額はカンマなし", () => {
    expect(formatYen(999)).toBe("¥999");
  });

  it("負の金額をフォーマットする", () => {
    expect(formatYen(-500)).toBe("¥-500");
  });
});

// ---------- formatDate ----------

describe("formatDate", () => {
  it("ISO文字列を YYYY/MM/DD にフォーマットする", () => {
    expect(formatDate("2026-03-13T00:00:00.000Z")).toBe("2026/03/13");
  });

  it("月・日が1桁の場合ゼロ埋めする", () => {
    expect(formatDate("2026-01-05T00:00:00.000Z")).toBe("2026/01/05");
  });

  it("12月31日をフォーマットする", () => {
    expect(formatDate("2025-12-31T00:00:00.000Z")).toBe("2025/12/31");
  });
});

// ---------- STATUS_LABELS ----------

describe("STATUS_LABELS", () => {
  it("5つのステータスが定義されている", () => {
    expect(Object.keys(STATUS_LABELS)).toHaveLength(5);
  });

  it("各ステータスに label と color がある", () => {
    for (const key of Object.keys(STATUS_LABELS)) {
      expect(STATUS_LABELS[key]).toHaveProperty("label");
      expect(STATUS_LABELS[key]).toHaveProperty("color");
    }
  });

  it("draft のラベルは「下書き」", () => {
    expect(STATUS_LABELS.draft.label).toBe("下書き");
  });
});

// ---------- validateExpenseForm ----------

describe("validateExpenseForm", () => {
  const validForm: ExpenseForm = {
    date: "2026-03-13",
    item: "cat-001",
    type: "",
    details: "客先訪問",
    transportation: "",
    route: "",
    tripType: "",
    amount: "1000",
    receipt: "",
    attachment: null,
  };

  it("全必須項目が入力されている場合、エラーなし", () => {
    const errors = validateExpenseForm(validForm);
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("日付が未入力の場合、date エラー", () => {
    const errors = validateExpenseForm({ ...validForm, date: "" });
    expect(errors.date).toBe("月日を入力してください");
  });

  it("精算項目が未選択の場合、item エラー", () => {
    const errors = validateExpenseForm({ ...validForm, item: "" });
    expect(errors.item).toBe("精算項目を選択してください");
  });

  it("詳細が未入力の場合、details エラー", () => {
    const errors = validateExpenseForm({ ...validForm, details: "" });
    expect(errors.details).toBe("詳細を入力してください");
  });

  it("金額が未入力の場合、amount エラー", () => {
    const errors = validateExpenseForm({ ...validForm, amount: "" });
    expect(errors.amount).toBe("金額を入力してください");
  });

  it("金額が 0 の場合、1円以上エラー", () => {
    const errors = validateExpenseForm({ ...validForm, amount: "0" });
    expect(errors.amount).toBe("金額は1円以上で入力してください");
  });

  it("金額が負数の場合、1円以上エラー", () => {
    const errors = validateExpenseForm({ ...validForm, amount: "-100" });
    expect(errors.amount).toBe("金額は1円以上で入力してください");
  });

  it("金額が 1 の場合、エラーなし", () => {
    const errors = validateExpenseForm({ ...validForm, amount: "1" });
    expect(errors.amount).toBeUndefined();
  });

  it("全項目が空の場合、複数エラーが返る", () => {
    const emptyForm: ExpenseForm = {
      date: "",
      item: "",
      type: "",
      details: "",
      transportation: "",
      route: "",
      tripType: "",
      amount: "",
      receipt: "",
      attachment: null,
    };
    const errors = validateExpenseForm(emptyForm);
    expect(Object.keys(errors)).toHaveLength(4);
    expect(errors.date).toBeDefined();
    expect(errors.item).toBeDefined();
    expect(errors.details).toBeDefined();
    expect(errors.amount).toBeDefined();
  });
});

// ---------- calculateTodayTotal ----------

describe("calculateTodayTotal", () => {
  const now = new Date("2026-03-13T10:00:00.000Z");

  const expenses: ExpenseData[] = [
    { amount: 1000, date: "2026-03-13T05:00:00.000Z" },
    { amount: 2000, date: "2026-03-13T15:00:00.000Z" },
    { amount: 3000, date: "2026-03-12T10:00:00.000Z" },
    { amount: 500, date: "2026-01-01T00:00:00.000Z" },
  ];

  it("当日の経費のみ合計する", () => {
    expect(calculateTodayTotal(expenses, now)).toBe(3000);
  });

  it("当日のデータがない場合は 0", () => {
    const noToday: ExpenseData[] = [
      { amount: 1000, date: "2026-03-12T00:00:00.000Z" },
    ];
    expect(calculateTodayTotal(noToday, now)).toBe(0);
  });

  it("空配列の場合は 0", () => {
    expect(calculateTodayTotal([], now)).toBe(0);
  });

  it("Date オブジェクトでも動作する", () => {
    const withDateObj: ExpenseData[] = [
      { amount: 500, date: new Date("2026-03-13T08:00:00.000Z") },
    ];
    expect(calculateTodayTotal(withDateObj, now)).toBe(500);
  });
});

// ---------- calculateMonthlyTotal ----------

describe("calculateMonthlyTotal", () => {
  const now = new Date("2026-03-13T10:00:00.000Z");

  const expenses: ExpenseData[] = [
    { amount: 1000, date: "2026-03-01T00:00:00.000Z" },
    { amount: 2000, date: "2026-03-13T00:00:00.000Z" },
    { amount: 3000, date: "2026-03-31T00:00:00.000Z" },
    { amount: 5000, date: "2026-02-15T00:00:00.000Z" },
    { amount: 7000, date: "2025-03-13T00:00:00.000Z" },
  ];

  it("当月の経費のみ合計する", () => {
    expect(calculateMonthlyTotal(expenses, now)).toBe(6000);
  });

  it("当月のデータがない場合は 0", () => {
    const noThisMonth: ExpenseData[] = [
      { amount: 1000, date: "2026-02-01T00:00:00.000Z" },
    ];
    expect(calculateMonthlyTotal(noThisMonth, now)).toBe(0);
  });

  it("前年同月のデータは含まない", () => {
    const lastYear: ExpenseData[] = [
      { amount: 1000, date: "2025-03-13T00:00:00.000Z" },
    ];
    expect(calculateMonthlyTotal(lastYear, now)).toBe(0);
  });
});

// ---------- calculateYearlyTotal ----------

describe("calculateYearlyTotal", () => {
  const now = new Date("2026-03-13T10:00:00.000Z");

  const expenses: ExpenseData[] = [
    { amount: 1000, date: "2026-01-01T00:00:00.000Z" },
    { amount: 2000, date: "2026-03-13T00:00:00.000Z" },
    { amount: 3000, date: "2026-12-31T00:00:00.000Z" },
    { amount: 5000, date: "2025-12-31T00:00:00.000Z" },
  ];

  it("当年の経費のみ合計する", () => {
    expect(calculateYearlyTotal(expenses, now)).toBe(6000);
  });

  it("前年のデータは含まない", () => {
    const lastYear: ExpenseData[] = [
      { amount: 5000, date: "2025-06-15T00:00:00.000Z" },
    ];
    expect(calculateYearlyTotal(lastYear, now)).toBe(0);
  });

  it("空配列の場合は 0", () => {
    expect(calculateYearlyTotal([], now)).toBe(0);
  });
});
