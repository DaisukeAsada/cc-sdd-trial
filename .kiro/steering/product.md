# Product Overview

図書館蔵書管理システム - 図書館の蔵書、貸出、予約、利用者を統合管理するWebアプリケーション

## Core Capabilities

1. **蔵書管理**: 書籍マスタと蔵書コピーのCRUD操作、ISBN管理
2. **貸出管理**: 蔵書の貸出・返却処理、貸出状況追跡
3. **予約管理**: 蔵書の予約受付・管理
4. **利用者管理**: 図書館利用者の登録・管理
5. **レポート**: 蔵書・貸出状況の統計・レポート生成
6. **通知管理**: 予約書籍の貸出可能通知、延滞リマインダー（非同期ジョブキュー）

## Target Use Cases

- 図書館員が蔵書の登録・編集・削除を行う
- 利用者情報の管理と貸出履歴の追跡
- 蔵書の貸出状況（AVAILABLE / BORROWED / RESERVED / MAINTENANCE）を管理
- 蔵書検索による書籍・コピーの特定

## Value Proposition

- **ドメイン駆動設計**: ビジネスロジックをドメイン層に集約
- **型安全性**: TypeScript + Branded Types でコンパイル時エラー検出
- **Result パターン**: 例外を使わない明示的なエラーハンドリング
- **テスタビリティ**: 依存性注入による高いテスト容易性
- **フルスタック**: React SPA + Express API のモノレポ構成

---
_Focus on patterns and purpose, not exhaustive feature lists_
_Updated: 2025-12-10 - Added frontend SPA capability_
