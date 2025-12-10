# Project Structure

## Organization Philosophy

**ドメイン駆動設計 + レイヤードアーキテクチャ**

ドメインごとにディレクトリを分離し、各ドメイン内でレイヤー（Controller/Service/Repository/Types）を構成。共通機能は `shared` に集約。

## Directory Patterns

### モノレポ構成
- `src/` - バックエンド（Express API）
- `client/` - フロントエンド（React SPA）
- ルートに共通設定（eslint, tsconfig, docker-compose）

### ドメイン層 (`src/domains/<domain>/`)
**Purpose**: ビジネスロジックを含むドメインモジュール  
**Files**:
- `types.ts` - ドメインエンティティ、入力/出力型、エラー型
- `<domain>-service.ts` - ビジネスロジック（インターフェース + 実装）
- `<domain>-repository.ts` - データアクセスインターフェース
- `<domain>-controller.ts` - REST API エンドポイント
- `*.test.ts` - 対応するソースのテストファイル
- `index.ts` - 公開 API バレルエクスポート

**Example**: `src/domains/book/book-service.ts`

### インフラストラクチャ層 (`src/infrastructure/`)
**Purpose**: 技術的実装詳細（DB、外部サービス）  
**Files**:
- `database/` - DB接続、マイグレーション、スキーマ

**Example**: `src/infrastructure/database/database.ts`

### 共有層 (`src/shared/`)
**Purpose**: 横断的ユーティリティ、型定義  
**Files**:
- `result.ts` - Result<T, E> パターン
- `branded-types.ts` - Branded Types（BookId, UserId 等）
- `validation.ts` - バリデーション関数

**Example**: `src/shared/result.ts`

### フロントエンド (`client/src/`)
**Purpose**: React SPA アプリケーション  
**Directories**:
- `components/` - 再利用可能なUIコンポーネント
- `pages/` - ルートに対応するページコンポーネント
- `routes/` - React Router ルーティング設定
- `contexts/` - React Context（認証など）
- `lib/` - ユーティリティ（APIクライアント等）
- `test/` - テスト設定

**Files**:
- `*.tsx` - React コンポーネント
- `*.test.tsx` - コンポーネントテスト（同階層配置）
- `index.ts` - バレルエクスポート

**Example**: `client/src/components/DataTable.tsx`

## Naming Conventions

- **Files**: kebab-case (`book-service.ts`, `branded-types.ts`)
- **Interfaces/Types**: PascalCase (`BookService`, `CreateBookInput`)
- **Functions**: camelCase (`createBookService`, `validateISBN`)
- **Constants**: UPPER_SNAKE_CASE（エラータイプ等）
- **Test files**: `<source>.test.ts`（同階層配置）

## Import Organization

```typescript
// 1. 外部モジュール
import { Router, type Request, type Response } from 'express';

// 2. 共有モジュール（相対パス）
import type { BookId } from '../../shared/branded-types.js';
import { isOk } from '../../shared/result.js';

// 3. 同一ドメイン内モジュール
import type { BookService } from './book-service.js';
import type { CreateBookInput } from './types.js';
```

**Path Aliases** (tsconfig.json):
- `@book/*` → `./src/domains/book/*`
- `@shared/*` → `./src/shared/*`
- `@infrastructure/*` → `./src/infrastructure/*`

**Note**: 現在は相対パスを使用。パスエイリアスは将来的な選択肢。

## Code Organization Principles

1. **依存関係ルール**: Controller → Service → Repository（逆方向禁止）
2. **インターフェース分離**: Repository インターフェースはドメイン層、実装は Infrastructure
3. **型優先**: すべての公開関数に明示的な戻り値型を指定
4. **readonly 優先**: エンティティ/入力型のプロパティは `readonly`
5. **ドメインエラー**: 各ドメインに専用のエラー型を定義（`BookError`）

---
_Document patterns, not file trees. New files following patterns shouldn't require updates_
_Updated: 2025-12-10 - Added monorepo structure and frontend patterns_
