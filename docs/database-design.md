# 経費精算システム データベース設計書

## 1. 概要

本ドキュメントは、経費精算システムのデータベース設計を定義する。

- **DBMS**: PostgreSQL 16
- **ORM**: Prisma（Next.js との親和性を考慮）
- **認証**: Microsoft Entra ID（Azure AD）経由で取得したユーザー情報をDBに同期

---

## 2. ER図

```
users 1──N expenses N──1 expense_categories
```

- 1人のユーザーが複数の経費申請を行う
- 各経費申請は1つの経費カテゴリに紐づく

---

## 3. テーブル定義

### 3.1 users（ユーザー情報）

従業員情報を管理する。Azure AD から同期されるマスタデータ。

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | ユーザーID |
| azure_ad_oid | VARCHAR(36) | UNIQUE, NOT NULL | Azure AD オブジェクトID |
| employee_number | VARCHAR(20) | UNIQUE, NOT NULL | 社員番号 |
| name | VARCHAR(100) | NOT NULL | 氏名 |
| email | VARCHAR(255) | UNIQUE, NOT NULL | メールアドレス |
| department | VARCHAR(100) | NOT NULL | 所属部門 |
| role | VARCHAR(20) | NOT NULL, DEFAULT 'employee' | 権限 |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | 有効フラグ |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 更新日時 |

**role の値**:

| 値 | 説明 |
|---|---|
| employee | 一般社員（経費申請のみ） |
| manager | 上長（経費申請＋承認） |
| admin | 管理者（全操作） |

**インデックス**:
- `idx_users_azure_ad_oid` ON (azure_ad_oid)
- `idx_users_email` ON (email)

---

### 3.2 expense_categories（精算項目マスタ）

経費の勘定科目・分類マスタ。

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | カテゴリID |
| code | VARCHAR(10) | UNIQUE, NOT NULL | 勘定科目コード |
| name | VARCHAR(100) | NOT NULL | カテゴリ名 |
| description | TEXT | NULL | 説明・備考 |
| budget_limit | DECIMAL(12,0) | NULL | 1件あたり上限額（円）。NULLは上限なし |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | 有効フラグ |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 更新日時 |

**初期データ例**:

| code | name |
|---|---|
| TRAVEL | 交通費 |
| HOTEL | 宿泊費 |
| MEAL | 飲食費 |
| SUPPLY | 消耗品費 |
| ENTER | 接待交際費 |
| COMM | 通信費 |
| OTHER | その他 |

**インデックス**:
- `idx_expense_categories_code` ON (code)

---

### 3.3 expenses（精算データ）

経費精算の申請データ。

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | 精算ID |
| applicant_id | UUID | FK → users.id, NOT NULL | 申請者ID |
| category_id | UUID | FK → expense_categories.id, NOT NULL | 経費カテゴリID |
| title | VARCHAR(200) | NOT NULL | 件名 |
| description | TEXT | NULL | 内容・目的 |
| amount | DECIMAL(12,0) | NOT NULL | 金額（円） |
| tax_amount | DECIMAL(12,0) | NOT NULL, DEFAULT 0 | 消費税額（円） |
| tax_rate | DECIMAL(4,2) | NOT NULL, DEFAULT 10.00 | 税率（%） |
| date | DATE | NOT NULL | 利用日 |
| vendor | VARCHAR(200) | NULL | 支払先 |
| receipt_url | VARCHAR(500) | NULL | 領収書ファイルのURL |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'draft' | 申請ステータス |
| approver_id | UUID | FK → users.id, NULL | 承認者ID |
| approved_at | TIMESTAMPTZ | NULL | 承認日時 |
| rejection_reason | TEXT | NULL | 却下理由 |
| submitted_at | TIMESTAMPTZ | NULL | 提出日時 |
| settled_at | TIMESTAMPTZ | NULL | 精算完了日時 |
| fiscal_year | INTEGER | NOT NULL | 会計年度 |
| fiscal_month | INTEGER | NOT NULL, CHECK (1-12) | 会計月 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 更新日時 |

**status の遷移**:
```
draft → submitted → approved → settled
                  ↘ rejected → draft（差し戻し再申請）
```

| ステータス | 説明 |
|---|---|
| draft | 下書き（申請者が編集中） |
| submitted | 提出済み（承認待ち） |
| approved | 承認済み（経理処理待ち） |
| rejected | 却下（差し戻し） |
| settled | 精算完了 |

**インデックス**:
- `idx_expenses_applicant_id` ON (applicant_id)
- `idx_expenses_category_id` ON (category_id)
- `idx_expenses_status` ON (status)
- `idx_expenses_date` ON (date)
- `idx_expenses_submitted_at` ON (submitted_at)
- `idx_expenses_fiscal` ON (fiscal_year, fiscal_month)

---

## 4. 外部キー制約

| FK | 親テーブル | ON DELETE |
|---|---|---|
| expenses.applicant_id | users | RESTRICT |
| expenses.approver_id | users | SET NULL |
| expenses.category_id | expense_categories | RESTRICT |

- **RESTRICT**: 参照先に紐づくデータがある場合、削除を禁止
- **SET NULL**: 参照先が削除された場合、NULLに設定

---

## 5. 共通設計方針

1. **主キー**: 全テーブル UUID v4 を採用。分散環境でのID衝突を回避。
2. **タイムスタンプ**: TIMESTAMPTZ（タイムゾーン付き）を使用。アプリ側で JST 表示に変換。
3. **金額**: DECIMAL(12,0)（円単位・整数）。浮動小数点の丸め誤差を回避。
4. **論理削除**: `is_active` フラグによるソフトデリート。マスタデータは物理削除しない。
5. **監査列**: 全テーブルに `created_at`, `updated_at` を設置。

**updated_at 自動更新トリガー**:
```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルに適用
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_expense_categories_updated_at
  BEFORE UPDATE ON expense_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 6. DDL

```sql
-- 1. expense_categories
CREATE TABLE expense_categories (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  code           VARCHAR(10)  NOT NULL UNIQUE,
  name           VARCHAR(100) NOT NULL,
  description    TEXT,
  budget_limit   DECIMAL(12,0),
  is_active      BOOLEAN      NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 2. users
CREATE TABLE users (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  azure_ad_oid    VARCHAR(36)  NOT NULL UNIQUE,
  employee_number VARCHAR(20)  NOT NULL UNIQUE,
  name            VARCHAR(100) NOT NULL,
  email           VARCHAR(255) NOT NULL UNIQUE,
  department      VARCHAR(100) NOT NULL,
  role            VARCHAR(20)  NOT NULL DEFAULT 'employee',
  is_active       BOOLEAN      NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 3. expenses
CREATE TABLE expenses (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id     UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  category_id      UUID          NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
  title            VARCHAR(200)  NOT NULL,
  description      TEXT,
  amount           DECIMAL(12,0) NOT NULL,
  tax_amount       DECIMAL(12,0) NOT NULL DEFAULT 0,
  tax_rate         DECIMAL(4,2)  NOT NULL DEFAULT 10.00,
  date             DATE          NOT NULL,
  vendor           VARCHAR(200),
  receipt_url      VARCHAR(500),
  status           VARCHAR(20)   NOT NULL DEFAULT 'draft',
  approver_id      UUID          REFERENCES users(id) ON DELETE SET NULL,
  approved_at      TIMESTAMPTZ,
  rejection_reason TEXT,
  submitted_at     TIMESTAMPTZ,
  settled_at       TIMESTAMPTZ,
  fiscal_year      INTEGER       NOT NULL,
  fiscal_month     INTEGER       NOT NULL CHECK (fiscal_month BETWEEN 1 AND 12),
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX idx_users_azure_ad_oid     ON users(azure_ad_oid);
CREATE INDEX idx_users_email            ON users(email);
CREATE INDEX idx_expense_categories_code ON expense_categories(code);
CREATE INDEX idx_expenses_applicant_id  ON expenses(applicant_id);
CREATE INDEX idx_expenses_category_id   ON expenses(category_id);
CREATE INDEX idx_expenses_status        ON expenses(status);
CREATE INDEX idx_expenses_date          ON expenses(date);
CREATE INDEX idx_expenses_submitted_at  ON expenses(submitted_at);
CREATE INDEX idx_expenses_fiscal        ON expenses(fiscal_year, fiscal_month);

-- updated_at トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_expense_categories_updated_at
  BEFORE UPDATE ON expense_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```
