# 経費精算システム API 設計書

## 1. 概要

経費精算データを操作する REST API の設計を定義する。

- **ベースURL**: `http://localhost:3000`
- **フレームワーク**: Next.js 14 App Router (Route Handlers)
- **データベース**: SQLite（Prisma ORM 経由）
- **データ形式**: JSON

---

## 2. API 一覧

| メソッド | エンドポイント | 説明 |
|---|---|---|
| GET | `/api/expenses` | 経費一覧を取得 |
| POST | `/api/expenses` | 新しい経費データを登録 |
| GET | `/api/expenses/{id}` | 特定の経費データを取得 |
| PUT | `/api/expenses/{id}` | 既存の経費データを更新 |
| DELETE | `/api/expenses/{id}` | 指定した経費データを削除 |

---

## 3. 共通仕様

### 3.1 リクエストヘッダ

| ヘッダ | 値 | 備考 |
|---|---|---|
| Content-Type | application/json | POST / PUT リクエスト時に必須 |

### 3.2 エラーレスポンス形式

全 API 共通で、エラー時は以下の形式で返却する。

```json
{
  "error": "エラーメッセージ"
}
```

### 3.3 共通ステータスコード

| コード | 説明 |
|---|---|
| 200 | 成功（取得・更新・削除） |
| 201 | 作成成功（POST） |
| 400 | バリデーションエラー |
| 404 | リソースが見つからない |
| 500 | サーバー内部エラー |

### 3.4 リレーション情報

レスポンスには以下のリレーションデータが含まれる。

**applicant（申請者）**:
```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "department": "string"
}
```

**approver（承認者）**（個別取得・更新時のみ）:
```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "department": "string"
}
```

**category（経費カテゴリ）**:
```json
{
  "id": "string",
  "code": "string",
  "name": "string"
}
```

---

## 4. API 詳細

### 4.1 GET /api/expenses

経費データの一覧を取得する。作成日時の降順で返却する。

#### クエリパラメータ

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| status | string | 任意 | ステータスでフィルタ（draft / submitted / approved / rejected / settled） |
| applicantId | string | 任意 | 申請者IDでフィルタ |

#### リクエスト例

```
GET /api/expenses
GET /api/expenses?status=submitted
GET /api/expenses?applicantId=550e8400-e29b-41d4-a716-446655440000
GET /api/expenses?status=draft&applicantId=550e8400-e29b-41d4-a716-446655440000
```

#### レスポンス（200 OK）

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "applicantId": "660e8400-e29b-41d4-a716-446655440001",
    "categoryId": "770e8400-e29b-41d4-a716-446655440002",
    "title": "東京出張 交通費",
    "description": "顧客先訪問のための新幹線代",
    "amount": 14000,
    "taxAmount": 1272,
    "taxRate": 10.0,
    "date": "2026-03-10T00:00:00.000Z",
    "vendor": "JR東海",
    "receiptUrl": null,
    "status": "draft",
    "approverId": null,
    "approvedAt": null,
    "rejectionReason": null,
    "submittedAt": null,
    "settledAt": null,
    "fiscalYear": 2025,
    "fiscalMonth": 3,
    "createdAt": "2026-03-10T05:30:00.000Z",
    "updatedAt": "2026-03-10T05:30:00.000Z",
    "applicant": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "山田 太郎",
      "email": "yamada@example.com",
      "department": "営業部"
    },
    "category": {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "code": "TRAVEL",
      "name": "交通費"
    }
  }
]
```

---

### 4.2 POST /api/expenses

新しい経費データを登録する。初期ステータスは `draft`（下書き）。

#### リクエストボディ

| フィールド | 型 | 必須 | デフォルト | 説明 |
|---|---|---|---|---|
| applicantId | string | **必須** | - | 申請者のユーザーID |
| categoryId | string | **必須** | - | 経費カテゴリID |
| title | string | **必須** | - | 件名 |
| description | string | 任意 | null | 内容・目的 |
| amount | integer | **必須** | - | 金額（円） |
| taxAmount | integer | 任意 | 0 | 消費税額（円） |
| taxRate | number | 任意 | 10.00 | 税率（%） |
| date | string | **必須** | - | 利用日（ISO 8601 形式） |
| vendor | string | 任意 | null | 支払先 |
| receiptUrl | string | 任意 | null | 領収書ファイルURL |
| fiscalYear | integer | **必須** | - | 会計年度 |
| fiscalMonth | integer | **必須** | - | 会計月（1〜12） |

#### リクエスト例

```json
{
  "applicantId": "660e8400-e29b-41d4-a716-446655440001",
  "categoryId": "770e8400-e29b-41d4-a716-446655440002",
  "title": "東京出張 交通費",
  "description": "顧客先訪問のための新幹線代",
  "amount": 14000,
  "taxAmount": 1272,
  "taxRate": 10.0,
  "date": "2026-03-10",
  "vendor": "JR東海",
  "fiscalYear": 2025,
  "fiscalMonth": 3
}
```

#### レスポンス（201 Created）

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "applicantId": "660e8400-e29b-41d4-a716-446655440001",
  "categoryId": "770e8400-e29b-41d4-a716-446655440002",
  "title": "東京出張 交通費",
  "description": "顧客先訪問のための新幹線代",
  "amount": 14000,
  "taxAmount": 1272,
  "taxRate": 10.0,
  "date": "2026-03-10T00:00:00.000Z",
  "vendor": "JR東海",
  "receiptUrl": null,
  "status": "draft",
  "approverId": null,
  "approvedAt": null,
  "rejectionReason": null,
  "submittedAt": null,
  "settledAt": null,
  "fiscalYear": 2025,
  "fiscalMonth": 3,
  "createdAt": "2026-03-10T05:30:00.000Z",
  "updatedAt": "2026-03-10T05:30:00.000Z",
  "applicant": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "山田 太郎",
    "email": "yamada@example.com",
    "department": "営業部"
  },
  "category": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "code": "TRAVEL",
    "name": "交通費"
  }
}
```

#### エラーレスポンス（400 Bad Request）

```json
{
  "error": "必須項目が不足しています（applicantId, categoryId, title, amount, date, fiscalYear, fiscalMonth）"
}
```

```json
{
  "error": "fiscalMonth は 1〜12 の範囲で指定してください"
}
```

---

### 4.3 GET /api/expenses/{id}

特定の経費データを取得する。承認者情報も含めて返却する。

#### パスパラメータ

| パラメータ | 型 | 説明 |
|---|---|---|
| id | string (UUID) | 経費データのID |

#### リクエスト例

```
GET /api/expenses/550e8400-e29b-41d4-a716-446655440000
```

#### レスポンス（200 OK）

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "applicantId": "660e8400-e29b-41d4-a716-446655440001",
  "categoryId": "770e8400-e29b-41d4-a716-446655440002",
  "title": "東京出張 交通費",
  "description": "顧客先訪問のための新幹線代",
  "amount": 14000,
  "taxAmount": 1272,
  "taxRate": 10.0,
  "date": "2026-03-10T00:00:00.000Z",
  "vendor": "JR東海",
  "receiptUrl": null,
  "status": "approved",
  "approverId": "880e8400-e29b-41d4-a716-446655440003",
  "approvedAt": "2026-03-11T09:00:00.000Z",
  "rejectionReason": null,
  "submittedAt": "2026-03-10T06:00:00.000Z",
  "settledAt": null,
  "fiscalYear": 2025,
  "fiscalMonth": 3,
  "createdAt": "2026-03-10T05:30:00.000Z",
  "updatedAt": "2026-03-11T09:00:00.000Z",
  "applicant": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "山田 太郎",
    "email": "yamada@example.com",
    "department": "営業部"
  },
  "approver": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "name": "佐藤 花子",
    "email": "sato@example.com",
    "department": "営業部"
  },
  "category": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "code": "TRAVEL",
    "name": "交通費"
  }
}
```

#### エラーレスポンス（404 Not Found）

```json
{
  "error": "指定された経費データが見つかりません"
}
```

---

### 4.4 PUT /api/expenses/{id}

既存の経費データを更新する。部分更新に対応しており、送信したフィールドのみ更新される。

#### パスパラメータ

| パラメータ | 型 | 説明 |
|---|---|---|
| id | string (UUID) | 経費データのID |

#### リクエストボディ

全フィールド任意。送信したフィールドのみ更新される。

| フィールド | 型 | 説明 |
|---|---|---|
| categoryId | string | 経費カテゴリID |
| title | string | 件名 |
| description | string \| null | 内容・目的 |
| amount | integer | 金額（円） |
| taxAmount | integer | 消費税額（円） |
| taxRate | number | 税率（%） |
| date | string | 利用日（ISO 8601 形式） |
| vendor | string \| null | 支払先 |
| receiptUrl | string \| null | 領収書ファイルURL |
| status | string | ステータス（draft / submitted / approved / rejected / settled） |
| approverId | string \| null | 承認者ID |
| approvedAt | string \| null | 承認日時（ISO 8601 形式） |
| rejectionReason | string \| null | 却下理由 |
| submittedAt | string \| null | 提出日時（ISO 8601 形式） |
| settledAt | string \| null | 精算完了日時（ISO 8601 形式） |
| fiscalYear | integer | 会計年度 |
| fiscalMonth | integer | 会計月（1〜12） |

#### リクエスト例（ステータスを提出済みに更新）

```json
{
  "status": "submitted",
  "submittedAt": "2026-03-10T06:00:00.000Z"
}
```

#### リクエスト例（承認）

```json
{
  "status": "approved",
  "approverId": "880e8400-e29b-41d4-a716-446655440003",
  "approvedAt": "2026-03-11T09:00:00.000Z"
}
```

#### リクエスト例（却下）

```json
{
  "status": "rejected",
  "approverId": "880e8400-e29b-41d4-a716-446655440003",
  "approvedAt": "2026-03-11T09:00:00.000Z",
  "rejectionReason": "領収書が添付されていません"
}
```

#### レスポンス（200 OK）

更新後の経費データ（GET /api/expenses/{id} と同一形式）を返却する。

#### エラーレスポンス

- **404 Not Found**: 指定された経費データが存在しない
- **400 Bad Request**: `fiscalMonth` が範囲外

---

### 4.5 DELETE /api/expenses/{id}

指定した経費データを削除する。

#### パスパラメータ

| パラメータ | 型 | 説明 |
|---|---|---|
| id | string (UUID) | 経費データのID |

#### リクエスト例

```
DELETE /api/expenses/550e8400-e29b-41d4-a716-446655440000
```

#### レスポンス（200 OK）

```json
{
  "message": "経費データを削除しました"
}
```

#### エラーレスポンス（404 Not Found）

```json
{
  "error": "指定された経費データが見つかりません"
}
```

---

## 5. ステータス遷移

経費データの `status` は以下の順序で遷移する。

```
draft → submitted → approved → settled
                  ↘ rejected → draft（差し戻し再申請）
```

| 遷移 | 操作 | 更新されるフィールド |
|---|---|---|
| draft → submitted | 申請者が提出 | status, submittedAt |
| submitted → approved | 承認者が承認 | status, approverId, approvedAt |
| submitted → rejected | 承認者が却下 | status, approverId, approvedAt, rejectionReason |
| rejected → draft | 申請者が再編集 | status |
| approved → settled | 経理が精算完了 | status, settledAt |

---

## 6. 実装ファイル

| ファイル | 対応 API |
|---|---|
| `src/lib/prisma.ts` | Prisma クライアントのシングルトンインスタンス |
| `src/app/api/expenses/route.ts` | GET /api/expenses, POST /api/expenses |
| `src/app/api/expenses/[id]/route.ts` | GET・PUT・DELETE /api/expenses/{id} |
