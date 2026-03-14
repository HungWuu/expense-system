## 開発ログ（Claude Code との会話履歴）

### **フェーズ1: 環境構築（課題①〜②）**

#### **Prompt**<br>
 Next.js 14のプロジェクトを作成してください。以下の設定でお願いします：
 - TypeScript: 使用する
 - ESLint: 使用する
 - Tailwind CSS: 使用する
 - src/ ディレクトリ: 使用する
 - App Router: 使用する
 - インポートエイリアス: @/* を使用

#### **Result**<br>
プロジェクト作成成功

---

### **フェーズ2: 画面UI作成（課題③〜⑤）**

#### **Prompt 1**<br>
タスク：Next.js (App Router) と Tailwind CSS を使用してログイン画面を作成してください。<br>
要件：<br>
 - /login ルートにログインページを作成
 - 画面を左右2カラムのレイアウトにする
  - 左側：
   - 緑系のグラデーション背景
   - 中央に「Bridge System」ロゴを表示
  - 右側：
   - カード形式のログインUI
   - 「Microsoftでログイン」ボタンを配置
   - ボタンはクリック可能な状態
#### **Result 1**<br>
ログイン画面のUI作成成功

#### **Prompt 2**<br>
タスク：精算一覧画面（ダッシュボード）を作成してください。<br>

要件：
- ヘッダー（ユーザー名・ログアウトアイコン）
- 「新規登録」ボタン
- 精算一覧テーブル
- ページネーション

UI要件：
- ヘッダーは緑色
- 右上にユーザー名とアバター
- 「新規登録」ボタンは右上
- テーブルはソート・フィルター可能
- 下部に当日 / 当月 / 当年の合計表示

#### **Result 2**<br>
一覧画面のUI作成成功

#### **Prompt 3**<br>
タスク：精算一覧画面を作成してください。

タスク：交通費精算の入力フォームをモーダルで作成してください。<br>
要件： 
- 「新規登録」ボタンを押すとモーダルが開く 
- 全ての入力項目が表示される 、以下の入力項目を表示： 
 - 月日：日付ピッカー
 - 精算項目：ドロップダウン
 - 種別：テキスト入力 　
 - 詳細：テキスト入力 　
 - 交通手段：ラジオボタン（電車・バス・その他・作業車） 　
 - 経由：テキスト入力 　
 - 片道/往復：ラジオボタン 　
 - 金額：数値入力 　
 - 領収書：ラジオボタン（あり・なし） 　
 - 添付ファイル：ファイルアップロード 
 - 「戻る」でモーダルが閉じる <br>

ボタン：
 - 「登録」ボタン: 緑色 
 - 「戻る」ボタン: グレー

#### **Result 3**<br>
新規入力画面（モーダル）のUI作成成功

---

### **フェーズ3: 認証機能（課題⑥〜⑦）**
#### **Prompt 1**<br>
Microsoft Entra ID（Azure AD）でアプリ登録する手順を教えてください。
NextAuth.js で使用するための設定が必要です。

#### **Result 1**<br>
Azure Portal にて Microsoft Entra ID アプリ登録を作成。

主な手順：

1. Azure Portal にログイン
2. Microsoft Entra ID → アプリ登録
3. 新規登録

設定内容：

- アプリ名：Bridge System
- Redirect URI：
http://localhost:3000/api/auth/callback/azure-ad

取得した情報：
- Client ID
- Tenant ID
- Client Secret

NextAuth.js 用に `.env.local` を設定。
AZURE_AD_CLIENT_ID
AZURE_AD_CLIENT_SECRET
AZURE_AD_TENANT_ID
NEXTAUTH_SECRET
NEXTAUTH_URL
NextAuth.js の Azure AD Provider を設定し、  
Microsoft ログイン機能を実装。

#### **Prompt 2**<br>
NextAuth.js を使って Microsoft ログインを実装してください。
- 未ログイン → /login へリダイレクト
- ログイン成功 → /dashboard へリダイレクト
- ログアウト → /login へリダイレクト

#### **Result 2**<br>
Microsoft ログインを実装成功


---

### **フェーズ4: データベース設計（課題⑧〜⑨）**

#### **Prompt**<br>
経費精算システムのデータベース設計書を作成してください。
必要なテーブル:
- users: ユーザー情報
- expenses: 精算データ
- expense_categories: 精算項目マスタ
---

### **フェーズ5: API開発（課題⑩〜⑫）**
#### **Prompt**<br>
経費精算システムのAPI設計書を作成してください。
- GET /api/expenses - 一覧取得
- POST /api/expenses - 新規登録
- PUT /api/expenses/[id] - 更新
- DELETE /api/expenses/[id] - 削除
---

### **フェーズ6: 画面とAPIの連携（課題⑬〜⑮）**

#### **Prompt**<br>
タスク:一覧画面とAPIを連携し、経費一覧を表示できるようにする。
要件:
- 一覧データの取得・表示
- フィルター・ソート機能
- ページネーション機能を実装する（1ページあたり10件表示）
- 合計金額の計算・表示
実装条件:
- 初期データは Server Components で取得すること
- フィルターやソートなどの画面操作は Client Components で処理すること
- 当日 / 当月 / 当年の合計金額を計算して表示すること

#### **Result**<br>

一覧画面と API の連携を実装。

主な実装内容：

- Server Components による初期データ取得
- Client Components によるフィルター / ソート処理
- ページネーション実装
- 合計金額表示

#### **Debug Prompt 1**<br>

一覧画面を確認したところ、「新規登録」のボタンが表示されなくなっています。  
課題12で実装した新規登録機能が消えてしまったようです。
一覧画面に新規登録ボタンを再表示するよう修正してください。

#### **Debug Result 1**<br>

一覧画面のコンポーネント構造を確認した結果、  
UI 再構築時に「新規登録」ボタンのコンポーネントが削除されていたことが判明。
ダッシュボードヘッダー部分に  新規登録ボタンを再追加し、モーダル起動処理を復元した。

#### **Debug Prompt 2**<br>

新規登録画面から登録しようとすると、"経費データの登録に失敗しました"と表示されます。POST `/api/expenses` のリクエスト内容とレスポンス内容を確認して、  
どの項目が不足または不正なのか調査してください。

#### **Debug Result 2**<br>
POST `/api/expenses` を確認した結果、*applicantId*が未設定であることが判明。現在は Azure AD ログインユーザーと  
users テーブルの連携が実装されていないため登録処理が失敗していた。

#### **Debug Prompt 3**<br>
暫定対応としてapplicantId = "user-001"を固定値として設定し、新規登録処理を通すように修正。
また将来的な対応として、
- Azure AD ログインユーザーを
- users テーブルへ自動作成
する方針をコメントとして残した。


---

### **フェーズ7: テスト（課題⑯〜⑱）**
#### **Prompt**<br>
テスト仕様書作成およびテスト実装。
対象：
- Microsoftログイン
- 一覧表示
- 新規登録
- 編集
- 削除

#### **Result**<br>
テスト仕様書を作成。

テスト分類：

単体テスト  
統合テスト  
E2Eテスト

Vitest によるユニットテスト実装。
Playwright による E2E テスト実装。


### **フェーズ8: 仕上げ（課題⑲〜⑳）**
#### **Prompt**<br>
エラーハンドリングと UI 改善。

#### **Result**<br>

以下を改善：
- APIエラーメッセージ
- ローディング表示
- キーボード操作対応
- アクセシビリティ対応

#### **Debug Prompt**<br>
Vercel へデプロイしたところ、  以下の build error が発生しました。
"TypeError: A is not a constructor
Error: Failed to collect page data for /api/expenses/[id]"原因を調査し、修正してください。

#### **Debug Result**<br>
デプロイ先のデータベースにexpenses テーブルが作成されていないことが原因と判明。
Prisma migration を実行し、expenses テーブルを作成。
その後再デプロイを行い、エラーが解消された。
