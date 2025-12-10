# Technology Stack

## Architecture

**レイヤードアーキテクチャ + ドメイン駆動設計**

- **Controller層**: HTTPリクエスト/レスポンス処理、REST API
- **Service層**: ビジネスロジック、バリデーション
- **Repository層**: データアクセス抽象化（インターフェース定義はドメイン層）
- **Infrastructure層**: 具体的な技術実装（DB、外部サービス）
- **Shared層**: 横断的ユーティリティ（Result、Branded Types、バリデーション）

## Core Technologies

- **Language**: TypeScript 5.x（strict mode）
- **Runtime**: Node.js 20+
- **Framework**: Express 5.x
- **Database**: PostgreSQL（pg ライブラリ）
- **Message Queue**: Redis + BullMQ（非同期ジョブ処理）

## Key Libraries

- **pg**: PostgreSQL クライアント
- **express**: Web フレームワーク
- **bullmq**: ジョブキュー（Redis ベース）
- **ioredis**: Redis クライアント
- **vitest**: テストフレームワーク
- **eslint + prettier**: コード品質・フォーマット

## Development Standards

### Type Safety
- TypeScript strict mode 有効
- `noUncheckedIndexedAccess`: 配列/オブジェクトアクセスの安全性
- `exactOptionalPropertyTypes`: オプショナルプロパティの厳密化
- Branded Types でドメインIDの型安全性を確保

### Code Quality
- ESLint strictTypeChecked + stylisticTypeChecked
- `@typescript-eslint/explicit-function-return-type`: 必須
- `@typescript-eslint/strict-boolean-expressions`: 必須
- Prettier 統合

### Testing
- Vitest によるユニット/統合テスト
- `*.test.ts` ファイルをソースと同階層に配置
- Repository はモック、Service/Controller は統合テスト

## Development Environment

### Required Tools
- Node.js 20+
- Docker / Docker Compose（PostgreSQL）
- pnpm / npm

### Common Commands
```bash
# Dev: npm run dev
# Build: npm run build
# Test: npm test / npm run test:run
# Lint: npm run lint / npm run lint:fix
# DB: npm run docker:up / npm run docker:down
```

## Key Technical Decisions

1. **Result パターン**: 例外を投げずに `Result<T, E>` 型で成功/失敗を表現
2. **Branded Types**: `BookId`, `UserId` 等でプリミティブ型の誤用を防止
3. **依存性注入**: ファクトリ関数で依存関係を注入（`createBookService(repo)`）
4. **インターフェース分離**: Repository はドメイン層でインターフェース定義、Infrastructure で実装
5. **非同期ジョブキュー**: BullMQ + Redis で通知等の非同期処理を実現

---
_Document standards and patterns, not every dependency_
_Updated: 2025-12-10 - Added BullMQ/Redis job queue pattern_
