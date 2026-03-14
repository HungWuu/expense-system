import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client.js";

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL ?? "file:./dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const categories = [
    { code: "TRAVEL",  name: "交通費",     description: "電車・バス・タクシー・飛行機等の交通費", budgetLimit: null },
    { code: "HOTEL",   name: "宿泊費",     description: "出張時のホテル・旅館等の宿泊費",       budgetLimit: 20000 },
    { code: "MEAL",    name: "飲食費",      description: "業務上の食事・飲料費",                 budgetLimit: 5000 },
    { code: "ENTER",   name: "接待交際費",  description: "取引先との会食・贈答品等",              budgetLimit: 50000 },
    { code: "SUPPLY",  name: "消耗品費",    description: "文房具・備品等の消耗品購入費",          budgetLimit: 10000 },
    { code: "COMM",    name: "通信費",      description: "電話・インターネット・郵送等の通信費",   budgetLimit: null },
    { code: "BOOK",    name: "書籍・研修費", description: "業務関連の書籍購入・セミナー参加費",    budgetLimit: 30000 },
    { code: "OTHER",   name: "その他",      description: "上記に該当しないその他の経費",          budgetLimit: null },
  ];

  for (const category of categories) {
    await prisma.expenseCategory.upsert({
      where: { code: category.code },
      update: {
        name: category.name,
        description: category.description,
        budgetLimit: category.budgetLimit,
      },
      create: category,
    });
  }

  console.log(`Seeded ${categories.length} expense categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
