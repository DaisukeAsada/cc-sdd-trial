---
applyTo: '**/*.ts'
---
- eslintやtsconifigの設定に従ってコーディングしてください。
- TypeScriptの型システムを活用して、型安全なコードを書くようにしてください。
- コードの生成とリグレッションテストが終わったら、構文エラーやコンパイルエラーがないか確認してください。
- コマンド例
```bash
# 構文エラーのチェック
npm run lint
# TypeScriptコンパイルチェック
npx tsc --noEmit
```
