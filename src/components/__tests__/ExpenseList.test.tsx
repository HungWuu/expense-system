import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExpenseList, type SerializedExpense } from "../ExpenseList";

// ---------- Mocks ----------

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: "user-001", name: "テスト太郎", email: "taro@example.com" } },
  }),
  signOut: vi.fn(),
}));

// ---------- Test Data ----------

function makeExpense(overrides: Partial<SerializedExpense> = {}): SerializedExpense {
  return {
    id: "exp-001",
    applicantId: "user-001",
    categoryId: "cat-001",
    title: "交通費 客先訪問",
    description: "客先訪問",
    amount: 1500,
    taxAmount: 150,
    taxRate: 10,
    date: "2026-03-13T00:00:00.000Z",
    vendor: "JR東日本",
    receiptUrl: null,
    status: "draft",
    approverId: null,
    approvedAt: null,
    rejectionReason: null,
    submittedAt: null,
    settledAt: null,
    fiscalYear: 2026,
    fiscalMonth: 3,
    createdAt: "2026-03-13T00:00:00.000Z",
    updatedAt: "2026-03-13T00:00:00.000Z",
    applicant: { id: "user-001", name: "テスト太郎", email: "taro@example.com", department: "営業部" },
    category: { id: "cat-001", code: "TRAVEL", name: "交通費" },
    ...overrides,
  };
}

const categories = [
  { id: "cat-001", code: "TRAVEL", name: "交通費" },
  { id: "cat-002", code: "MEAL", name: "飲食費" },
];

const defaultSummary = { todayTotal: 1500, monthlyTotal: 5000, yearlyTotal: 20000 };

// ---------- Tests ----------

describe("ExpenseList", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("サマリーカード", () => {
    it("当日・当月・当年の合計金額が表示される", () => {
      render(
        <ExpenseList
          expenses={[makeExpense()]}
          categories={categories}
          summary={{ todayTotal: 2500, monthlyTotal: 30000, yearlyTotal: 150000 }}
        />
      );

      // summary amounts are unique (not duplicated in table)
      expect(screen.getByText("¥2,500")).toBeInTheDocument();
      expect(screen.getByText("¥30,000")).toBeInTheDocument();
      expect(screen.getByText("¥150,000")).toBeInTheDocument();
    });

    it("合計が0の場合、¥0が表示される", () => {
      render(
        <ExpenseList
          expenses={[]}
          categories={categories}
          summary={{ todayTotal: 0, monthlyTotal: 0, yearlyTotal: 0 }}
        />
      );

      const zeros = screen.getAllByText("¥0");
      expect(zeros).toHaveLength(3);
    });
  });

  describe("一覧テーブル", () => {
    it("経費データが表示される", () => {
      const expense = makeExpense({ title: "交通費 出張", amount: 3200 });
      render(
        <ExpenseList expenses={[expense]} categories={categories} summary={defaultSummary} />
      );

      expect(screen.getByText("交通費 出張")).toBeInTheDocument();
      expect(screen.getByText("¥3,200")).toBeInTheDocument();
      // テスト太郎 is in both header and table; use getAllByText
      expect(screen.getAllByText("テスト太郎").length).toBeGreaterThanOrEqual(1);
      // 下書き appears in both status filter dropdown and table
      expect(screen.getAllByText("下書き").length).toBeGreaterThanOrEqual(1);
    });

    it("データがない場合、「データが見つかりません」と表示される", () => {
      render(
        <ExpenseList expenses={[]} categories={categories} summary={defaultSummary} />
      );

      expect(screen.getByText("データが見つかりません")).toBeInTheDocument();
    });

    it("ステータスラベルが正しく表示される", () => {
      const expenses = [
        makeExpense({ id: "1", status: "draft" }),
        makeExpense({ id: "2", status: "submitted" }),
        makeExpense({ id: "3", status: "approved" }),
      ];
      render(
        <ExpenseList expenses={expenses} categories={categories} summary={defaultSummary} />
      );

      // Status labels appear in both dropdown and table; use getAllByText
      expect(screen.getAllByText("下書き").length).toBeGreaterThanOrEqual(2); // dropdown + table
      expect(screen.getAllByText("提出済").length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText("承認済").length).toBeGreaterThanOrEqual(2);
    });

    it("領収書ありの場合は「あり」、なしの場合は「なし」と表示される", () => {
      const expenses = [
        makeExpense({ id: "1", receiptUrl: "/uploads/test.jpg" }),
        makeExpense({ id: "2", receiptUrl: null }),
      ];
      render(
        <ExpenseList expenses={expenses} categories={categories} summary={defaultSummary} />
      );

      expect(screen.getByText("あり")).toBeInTheDocument();
      expect(screen.getByText("なし")).toBeInTheDocument();
    });

    it("各行に編集・削除ボタンが表示される", () => {
      render(
        <ExpenseList expenses={[makeExpense()]} categories={categories} summary={defaultSummary} />
      );

      expect(screen.getByText("編集")).toBeInTheDocument();
      expect(screen.getByText("削除")).toBeInTheDocument();
    });
  });

  describe("フィルター", () => {
    const expenses = [
      makeExpense({ id: "1", title: "交通費 出張A", status: "draft", categoryId: "cat-001", category: { id: "cat-001", code: "TRAVEL", name: "交通費" } }),
      makeExpense({ id: "2", title: "飲食費 接待B", status: "submitted", categoryId: "cat-002", category: { id: "cat-002", code: "MEAL", name: "飲食費" } }),
      makeExpense({ id: "3", title: "交通費 出張C", status: "submitted", categoryId: "cat-001", category: { id: "cat-001", code: "TRAVEL", name: "交通費" } }),
    ];

    it("テキスト検索で件名がフィルターされる", async () => {
      const user = userEvent.setup();
      render(
        <ExpenseList expenses={expenses} categories={categories} summary={defaultSummary} />
      );

      const searchInput = screen.getByPlaceholderText("件名・申請者・支払先で検索...");
      await user.type(searchInput, "接待B");

      expect(screen.getByText("飲食費 接待B")).toBeInTheDocument();
      expect(screen.queryByText("交通費 出張A")).not.toBeInTheDocument();
    });

    it("ステータスでフィルターできる", async () => {
      const user = userEvent.setup();
      render(
        <ExpenseList expenses={expenses} categories={categories} summary={defaultSummary} />
      );

      const statusSelect = screen.getByDisplayValue("全ステータス");
      await user.selectOptions(statusSelect, "submitted");

      expect(screen.getByText("飲食費 接待B")).toBeInTheDocument();
      expect(screen.getByText("交通費 出張C")).toBeInTheDocument();
      expect(screen.queryByText("交通費 出張A")).not.toBeInTheDocument();
    });

    it("カテゴリでフィルターできる", async () => {
      const user = userEvent.setup();
      render(
        <ExpenseList expenses={expenses} categories={categories} summary={defaultSummary} />
      );

      const categorySelect = screen.getByDisplayValue("全カテゴリ");
      await user.selectOptions(categorySelect, "cat-002");

      expect(screen.getByText("飲食費 接待B")).toBeInTheDocument();
      expect(screen.queryByText("交通費 出張A")).not.toBeInTheDocument();
    });

    it("クリアボタンでフィルターがリセットされる", async () => {
      const user = userEvent.setup();
      render(
        <ExpenseList expenses={expenses} categories={categories} summary={defaultSummary} />
      );

      const statusSelect = screen.getByDisplayValue("全ステータス");
      await user.selectOptions(statusSelect, "draft");

      expect(screen.queryByText("飲食費 接待B")).not.toBeInTheDocument();

      const clearButton = screen.getByText("クリア");
      await user.click(clearButton);

      expect(screen.getByText("飲食費 接待B")).toBeInTheDocument();
      expect(screen.getByText("交通費 出張A")).toBeInTheDocument();
    });
  });

  describe("ソート", () => {
    const expenses = [
      makeExpense({ id: "1", title: "AAA", amount: 3000 }),
      makeExpense({ id: "2", title: "CCC", amount: 1000 }),
      makeExpense({ id: "3", title: "BBB", amount: 2000 }),
    ];

    it("件名カラムをクリックで昇順ソートされる", async () => {
      const user = userEvent.setup();
      render(
        <ExpenseList expenses={expenses} categories={categories} summary={defaultSummary} />
      );

      const titleHeader = screen.getByText("件名");
      await user.click(titleHeader);

      const rows = screen.getAllByRole("row");
      // rows[0] is the header row
      const cells = rows.slice(1).map((row) => within(row).getAllByRole("cell")[0].textContent);
      expect(cells).toEqual(["AAA", "BBB", "CCC"]);
    });

    it("同じカラムを再クリックで降順になる", async () => {
      const user = userEvent.setup();
      render(
        <ExpenseList expenses={expenses} categories={categories} summary={defaultSummary} />
      );

      const titleHeader = screen.getByText("件名");
      await user.click(titleHeader); // asc
      await user.click(titleHeader); // desc

      const rows = screen.getAllByRole("row");
      const cells = rows.slice(1).map((row) => within(row).getAllByRole("cell")[0].textContent);
      expect(cells).toEqual(["CCC", "BBB", "AAA"]);
    });
  });

  describe("ページネーション", () => {
    const expenses = Array.from({ length: 15 }, (_, i) =>
      makeExpense({ id: `exp-${i}`, title: `経費${String(i + 1).padStart(2, "0")}` })
    );

    it("1ページ目に10件表示される", () => {
      render(
        <ExpenseList expenses={expenses} categories={categories} summary={defaultSummary} />
      );

      expect(screen.getByText("15件中 1〜10件を表示")).toBeInTheDocument();
    });

    it("2ページ目に遷移すると残り5件が表示される", async () => {
      const user = userEvent.setup();
      render(
        <ExpenseList expenses={expenses} categories={categories} summary={defaultSummary} />
      );

      const page2Button = screen.getByRole("button", { name: "2ページ目" });
      await user.click(page2Button);

      expect(screen.getByText("15件中 11〜15件を表示")).toBeInTheDocument();
    });

    it("1ページ目では「前へ」ボタンが無効", () => {
      render(
        <ExpenseList expenses={expenses} categories={categories} summary={defaultSummary} />
      );

      const prevButton = screen.getByRole("button", { name: "前のページ" });
      expect(prevButton).toBeDisabled();
    });

    it("最終ページでは「次へ」ボタンが無効", async () => {
      const user = userEvent.setup();
      render(
        <ExpenseList expenses={expenses} categories={categories} summary={defaultSummary} />
      );

      const page2Button = screen.getByRole("button", { name: "2ページ目" });
      await user.click(page2Button);

      const nextButton = screen.getByRole("button", { name: "次のページ" });
      expect(nextButton).toBeDisabled();
    });
  });

  describe("新規登録モーダル", () => {
    it("新規登録ボタンでモーダルが開く", async () => {
      const user = userEvent.setup();
      render(
        <ExpenseList expenses={[]} categories={categories} summary={defaultSummary} />
      );

      await user.click(screen.getByText("新規登録"));
      expect(screen.getByText("経費精算 新規登録")).toBeInTheDocument();
    });

    it("戻るボタンでモーダルが閉じる", async () => {
      const user = userEvent.setup();
      render(
        <ExpenseList expenses={[]} categories={categories} summary={defaultSummary} />
      );

      await user.click(screen.getByText("新規登録"));
      expect(screen.getByText("経費精算 新規登録")).toBeInTheDocument();

      await user.click(screen.getByText("戻る"));
      expect(screen.queryByText("経費精算 新規登録")).not.toBeInTheDocument();
    });

    it("必須項目未入力で登録するとバリデーションエラーが表示される", async () => {
      const user = userEvent.setup();
      render(
        <ExpenseList expenses={[]} categories={categories} summary={defaultSummary} />
      );

      await user.click(screen.getByText("新規登録"));
      await user.click(screen.getByText("登録"));

      expect(screen.getByText("月日を入力してください")).toBeInTheDocument();
      expect(screen.getByText("精算項目を選択してください")).toBeInTheDocument();
      expect(screen.getByText("詳細を入力してください")).toBeInTheDocument();
      expect(screen.getByText("金額を入力してください")).toBeInTheDocument();
    });

    it("カテゴリドロップダウンにDBのカテゴリが表示される", async () => {
      const user = userEvent.setup();
      render(
        <ExpenseList expenses={[]} categories={categories} summary={defaultSummary} />
      );

      await user.click(screen.getByText("新規登録"));

      // Categories appear in both filter dropdown and modal dropdown
      const travelOptions = screen.getAllByText("交通費");
      expect(travelOptions.length).toBeGreaterThanOrEqual(2); // filter + modal
      const mealOptions = screen.getAllByText("飲食費");
      expect(mealOptions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("編集モーダル", () => {
    it("編集ボタンをクリックすると編集モーダルが開く", async () => {
      const user = userEvent.setup();
      const expense = makeExpense({ description: "テスト詳細" });
      render(
        <ExpenseList expenses={[expense]} categories={categories} summary={defaultSummary} />
      );

      await user.click(screen.getByText("編集"));
      expect(screen.getByText("経費精算 編集")).toBeInTheDocument();
    });

    it("編集モーダルに既存データがプリセットされる", async () => {
      const user = userEvent.setup();
      const expense = makeExpense({
        description: "テスト詳細",
        amount: 2500,
        date: "2026-03-10T00:00:00.000Z",
      });
      render(
        <ExpenseList expenses={[expense]} categories={categories} summary={defaultSummary} />
      );

      await user.click(screen.getByText("編集"));

      const detailsInput = screen.getByPlaceholderText("例: 客先訪問のため") as HTMLInputElement;
      expect(detailsInput.value).toBe("テスト詳細");

      const amountInput = screen.getByPlaceholderText("0") as HTMLInputElement;
      expect(amountInput.value).toBe("2500");
    });
  });

  describe("削除確認ダイアログ", () => {
    it("削除ボタンで確認ダイアログが表示される", async () => {
      const user = userEvent.setup();
      const expense = makeExpense({ title: "削除テスト用データ" });
      render(
        <ExpenseList expenses={[expense]} categories={categories} summary={defaultSummary} />
      );

      // "削除" button is in the table row
      const deleteButtons = screen.getAllByText("削除");
      await user.click(deleteButtons[0]);
      expect(screen.getByText("経費データの削除")).toBeInTheDocument();
      expect(screen.getByText("この操作は取り消せません。")).toBeInTheDocument();
      // Title appears in both table and dialog
      expect(screen.getAllByText("削除テスト用データ").length).toBeGreaterThanOrEqual(2);
    });

    it("キャンセルでダイアログが閉じる", async () => {
      const user = userEvent.setup();
      render(
        <ExpenseList expenses={[makeExpense()]} categories={categories} summary={defaultSummary} />
      );

      await user.click(screen.getByText("削除"));
      expect(screen.getByText("経費データの削除")).toBeInTheDocument();

      await user.click(screen.getByText("キャンセル"));
      expect(screen.queryByText("経費データの削除")).not.toBeInTheDocument();
    });
  });

  describe("キーボード操作", () => {
    it("Escapeキーでモーダルが閉じる", async () => {
      const user = userEvent.setup();
      render(
        <ExpenseList expenses={[]} categories={categories} summary={defaultSummary} />
      );

      await user.click(screen.getByText("新規登録"));
      expect(screen.getByText("経費精算 新規登録")).toBeInTheDocument();

      await user.keyboard("{Escape}");
      expect(screen.queryByText("経費精算 新規登録")).not.toBeInTheDocument();
    });

    it("Escapeキーで削除ダイアログが閉じる", async () => {
      const user = userEvent.setup();
      render(
        <ExpenseList expenses={[makeExpense()]} categories={categories} summary={defaultSummary} />
      );

      await user.click(screen.getByText("削除"));
      expect(screen.getByText("経費データの削除")).toBeInTheDocument();

      await user.keyboard("{Escape}");
      expect(screen.queryByText("経費データの削除")).not.toBeInTheDocument();
    });
  });

  describe("アクセシビリティ", () => {
    it("テーブルにaria-labelがある", () => {
      render(
        <ExpenseList expenses={[]} categories={categories} summary={defaultSummary} />
      );

      expect(screen.getByRole("table", { name: "経費一覧" })).toBeInTheDocument();
    });

    it("ソート可能なカラムヘッダーにaria-sortがある", () => {
      render(
        <ExpenseList expenses={[makeExpense()]} categories={categories} summary={defaultSummary} />
      );

      const dateHeader = screen.getByRole("columnheader", { name: /利用日/ });
      expect(dateHeader).toHaveAttribute("aria-sort", "descending"); // default sort
    });

    it("モーダルにrole=dialogとaria-modalがある", async () => {
      const user = userEvent.setup();
      render(
        <ExpenseList expenses={[]} categories={categories} summary={defaultSummary} />
      );

      await user.click(screen.getByText("新規登録"));
      expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    });

    it("削除ダイアログにrole=alertdialogがある", async () => {
      const user = userEvent.setup();
      render(
        <ExpenseList expenses={[makeExpense()]} categories={categories} summary={defaultSummary} />
      );

      await user.click(screen.getByText("削除"));
      expect(screen.getByRole("alertdialog")).toHaveAttribute("aria-modal", "true");
    });

    it("フィルターエリアにrole=searchがある", () => {
      render(
        <ExpenseList expenses={[]} categories={categories} summary={defaultSummary} />
      );

      expect(screen.getByRole("search", { name: "経費フィルター" })).toBeInTheDocument();
    });

    it("ページネーションにnav aria-labelがある", () => {
      render(
        <ExpenseList expenses={[makeExpense()]} categories={categories} summary={defaultSummary} />
      );

      expect(screen.getByRole("navigation", { name: "ページネーション" })).toBeInTheDocument();
    });
  });

  describe("ヘッダー", () => {
    it("アプリ名が表示される", () => {
      render(
        <ExpenseList expenses={[]} categories={categories} summary={defaultSummary} />
      );

      expect(screen.getByText("Bridge System")).toBeInTheDocument();
    });

    it("ログアウトボタンが表示される", () => {
      render(
        <ExpenseList expenses={[]} categories={categories} summary={defaultSummary} />
      );

      expect(screen.getByText("ログアウト")).toBeInTheDocument();
    });
  });
});
