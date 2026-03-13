import Database from "better-sqlite3";
import path from "path";

async function globalSetup() {
  const dbPath = path.resolve(process.cwd(), "dev.db");
  const db = new Database(dbPath);

  // テストユーザーを作成（既存なら更新）
  db.exec(`
    INSERT INTO users (id, azure_ad_oid, employee_number, name, email, department, role, is_active, created_at, updated_at)
    VALUES ('user-001', 'test-oid-001', 'EMP001', 'テスト太郎', 'taro@example.com', '営業部', 'employee', 1, datetime('now'), datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      name = 'テスト太郎',
      email = 'taro@example.com',
      department = '営業部',
      updated_at = datetime('now');
  `);

  db.close();
}

export default globalSetup;
