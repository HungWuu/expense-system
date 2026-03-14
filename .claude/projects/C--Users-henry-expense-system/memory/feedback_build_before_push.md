---
name: Build before push
description: Always run npm run build locally and confirm it passes before pushing to GitHub/Vercel
type: feedback
---

Vercel デプロイ前に必ずローカルで `npm run build` を通してから push すること。

**Why:** Vercel に何度も失敗デプロイを繰り返して時間を無駄にした。ローカルビルドが通っても Vercel で失敗するケースがあるため、ローカルで確実に通す必要がある。

**How to apply:** コードを変更したら `npm run build` を実行し、成功を確認してから `git commit && git push` する。ビルドエラーが出たら push しない。
