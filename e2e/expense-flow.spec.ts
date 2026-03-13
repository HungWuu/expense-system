import { test, expect } from "@playwright/test";

/**
 * E2Eテスト: 経費精算システムの主要フロー
 *
 * 1. ログイン画面にアクセス
 * 2. Microsoft ログイン（CredentialsProvider でモック）
 * 3. 新規データを登録
 * 4. 一覧に表示されることを確認
 * 5. ログアウト
 */

// NextAuth CredentialsProvider でログインするヘルパー
async function loginViaCredentials(page: import("@playwright/test").Page, baseURL: string) {
  // 1. CSRF トークンを取得
  const csrfRes = await page.request.get(`${baseURL}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();

  // 2. CredentialsProvider のサインイン API を呼ぶ
  const signInRes = await page.request.post(
    `${baseURL}/api/auth/callback/credentials`,
    {
      form: {
        csrfToken,
        username: "test-user",
        password: "test-pass",
      },
    }
  );

  // NextAuth はリダイレクトを返すが、APIリクエストのため cookie がセットされる
  expect(signInRes.ok() || signInRes.status() === 302).toBeTruthy();
}

test.describe("経費精算フロー E2E", () => {
  test("ログイン → 新規登録 → 一覧確認 → ログアウト", async ({ page, baseURL }) => {
    const base = baseURL!;

    // ========================================
    // Step 1: ログイン画面にアクセス
    // ========================================
    await page.goto("/login");
    await expect(page.locator("h2")).toContainText("ログイン");
    await expect(page.locator("button")).toContainText("Microsoftでログイン");

    // ========================================
    // Step 2: CredentialsProvider でログイン（Microsoft ログインのモック）
    // ========================================
    await loginViaCredentials(page, base);

    // ログイン後、ダッシュボードに遷移
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator("h1")).toContainText("Bridge System");
    await expect(page.locator("h2")).toContainText("精算一覧");

    // ========================================
    // Step 3: 新規データを登録
    // ========================================
    const uniqueDetail = `E2Eテスト${Date.now()}`;

    // 新規登録ボタンをクリック
    await page.click("button:has-text('新規登録')");
    await expect(page.locator("h3")).toContainText("経費精算 新規登録");

    // フォーム入力
    // 日付
    await page.fill('input[type="date"]', "2026-03-13");

    // 精算項目（カテゴリ選択）— 最初の select 内で「選択してください」がデフォルト
    const categorySelect = page.locator("select").nth(2); // filter: status(0), category(1), modal: item(2)
    await categorySelect.selectOption({ index: 1 }); // 最初のカテゴリ

    // 詳細
    await page.fill('input[placeholder="例: 客先訪問のため"]', uniqueDetail);

    // 金額
    await page.fill('input[placeholder="0"]', "5000");

    // 登録ボタンをクリック
    await page.click("button:has-text('登録'):not(:has-text('新規'))");

    // モーダルが閉じるのを待つ
    await expect(page.locator("h3")).not.toBeVisible({ timeout: 10_000 });

    // ========================================
    // Step 4: 一覧に表示されることを確認
    // ========================================
    // 登録したデータが一覧テーブルに表示される
    await expect(page.locator("table")).toContainText(uniqueDetail);
    await expect(page.locator("table")).toContainText("¥5,000");

    // ========================================
    // Step 5: ログアウト
    // ========================================
    await page.click("button:has-text('ログアウト')");

    // ログアウト後、ログイン画面に遷移する
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    await expect(page.locator("h2")).toContainText("ログイン");
  });
});
