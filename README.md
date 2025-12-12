# 図書館蔵書管理システム

図書館の蔵書、貸出、予約、利用者を統合管理するフルスタックWebアプリケーション

## 概要

本システムは、図書館業務をデジタル化し効率化するために設計されています。

> 📖 **詳細なプロダクト情報**: [.kiro/steering/product.md](.kiro/steering/product.md)

### 対象ユーザー

- **図書館員**: 蔵書・利用者・貸出の管理
- **システム管理者**: ユーザー権限管理、レポート閲覧

### 主要機能

| 機能 | 説明 |
|------|------|
| 🏷️ 蔵書管理 | 書籍マスタと蔵書コピーのCRUD操作 |
| 📚 貸出管理 | 貸出・返却処理、貸出状況追跡 |
| 📅 予約管理 | 予約受付・管理、順番待ち対応 |
| 👥 利用者管理 | 図書館利用者の登録・管理 |
| 🔍 検索機能 | タイトル・著者・ISBNによる検索 |
| 📊 レポート | 統計・レポート生成 |
| 🔔 通知機能 | 予約通知、延滞リマインダー（非同期ジョブキュー） |

> 📖 **詳細な要件定義**: [.kiro/specs/library-inventory-system/requirements.md](.kiro/specs/library-inventory-system/requirements.md)

## 技術スタック

### バックエンド

| カテゴリ | 技術 | バージョン | 用途 |
|----------|------|------------|------|
| 言語 | TypeScript | 5.9.x | 型安全な開発（strict mode） |
| ランタイム | Node.js | 24 LTS (Krypton) | サーバーサイド実行環境 |
| フレームワーク | Express | 5.x | REST API サーバー |
| データベース | PostgreSQL | 16 | リレーショナルDB |
| キャッシュ/キュー | Redis | 8 | セッション管理、ジョブキュー |
| ジョブキュー | BullMQ | 5.x | 非同期ジョブ処理（通知等） |

### フロントエンド

| カテゴリ | 技術 | バージョン | 用途 |
|----------|------|------------|------|
| 言語 | TypeScript | 5.9.x | 型安全な開発（strict mode） |
| UIライブラリ | React | 19 | コンポーネントベースUI |
| バンドラー | Vite | 7.x | 高速ビルド・HMR |
| ルーティング | React Router | 7.x | クライアントサイドルーティング |
| サーバー状態管理 | TanStack Query | 5.x | データフェッチ・キャッシュ |

### 開発環境・品質管理

| カテゴリ | 技術 | 用途 |
|----------|------|------|
| テスト | Vitest 4.x | ユニット・統合テスト |
| リンター | ESLint 9.x | コード品質チェック |
| フォーマッター | Prettier 3.x | コード整形 |
| コンテナ | Docker Compose | PostgreSQL/Redis のローカル環境 |
| 開発環境 | Dev Container | 統一された開発環境 |

> 📖 **技術選定の詳細**: [.kiro/steering/tech.md](.kiro/steering/tech.md)

## アーキテクチャ

本システムは**モノレポ構成**を採用し、**ドメイン駆動設計 + レイヤードアーキテクチャ**で構築されています。

```
┌─────────────────────────────────────────────────────┐
│                    Client (React SPA)                │
└─────────────────────┬───────────────────────────────┘
                      │ HTTP/REST
┌─────────────────────▼───────────────────────────────┐
│                  Backend (Express API)               │
├─────────────────────────────────────────────────────┤
│  Controller → Service → Repository → Infrastructure │
└─────────────────────────────────────────────────────┘
         │                              │
    ┌────▼────┐                   ┌─────▼─────┐
    │PostgreSQL│                   │   Redis   │
    └──────────┘                   └───────────┘
```

### 設計原則

| パターン | 概要 |
|----------|------|
| Result パターン | 例外を使わない明示的なエラーハンドリング |
| Branded Types | `BookId`, `UserId` 等でプリミティブ型の誤用を防止 |
| 依存性注入 | ファクトリ関数でテスタビリティを確保 |

> 📖 **詳細な設計ドキュメント**: [.kiro/specs/library-inventory-system/design.md](.kiro/specs/library-inventory-system/design.md)
>
> 📖 **技術選定の背景**: [.kiro/specs/library-inventory-system/research.md](.kiro/specs/library-inventory-system/research.md)
>
> 📖 **プロジェクト構造の詳細**: [.kiro/steering/structure.md](.kiro/steering/structure.md)

## 前提条件

| ツール | バージョン | 確認コマンド | 用途 |
|--------|------------|--------------|------|
| VS Code | 最新 | - | エディタ |
| Docker Desktop | 24 以上 | `docker -v` | コンテナ環境 |
| Dev Containers 拡張 | 最新 | - | VS Code 拡張 |

> 💡 Node.js や npm は Dev Container 内に含まれているため、ローカルへのインストールは不要です。

## セットアップ

本プロジェクトは **Dev Container** を使用して開発環境を構築します。

### クイックスタート

```bash
# 1. リポジトリをクローン
git clone https://github.com/DaisukeAsada/cc-sdd-trial.git
code cc-sdd-trial

# 2. VS Code で「Reopen in Container」を選択
#    または F1 → Dev Containers: Reopen in Container

# 3. 開発サーバーを起動
npm run dev                # バックエンド
cd client && npm run dev   # フロントエンド（別ターミナル）
```

> 💡 Dev Container 起動時に PostgreSQL・Redis・依存関係のインストールが自動で完了します。

### 動作確認

| サービス | URL | 備考 |
|----------|-----|------|
| フロントエンド | http://localhost:5173 | Vite 開発サーバー |
| バックエンドAPI | http://localhost:3000 | Express サーバー |
| ヘルスチェック | http://localhost:3000/health | API 動作確認 |
| PostgreSQL | localhost:5432 | DB 接続 |
| Redis | localhost:6379 | キャッシュ/キュー |

## スクリプト

### バックエンド（ルートディレクトリ）

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | TypeScript ビルド |
| `npm start` | プロダクション実行 |
| `npm run db:init` | データベース初期化 |
| `npm test` | テスト実行（watch mode） |
| `npm run test:run` | テスト実行（単発） |
| `npm run lint` | ESLint チェック |
| `npm run lint:fix` | ESLint 自動修正 |
| `npm run format` | Prettier 整形 |

### フロントエンド（client/）

| コマンド | 説明 |
|----------|------|
| `npm run dev` | Vite 開発サーバー起動 |
| `npm run build` | プロダクションビルド |
| `npm run preview` | ビルド結果のプレビュー |
| `npm test` | テスト実行（watch mode） |
| `npm run test:run` | テスト実行（単発） |
| `npm run lint` | ESLint チェック |

## プロジェクト構成

```
/
├── src/                        # バックエンド（Express API）
│   ├── domains/                # ドメイン層
│   │   ├── auth/               # 認証ドメイン
│   │   ├── book/               # 蔵書ドメイン
│   │   ├── loan/               # 貸出ドメイン
│   │   ├── notification/       # 通知ドメイン
│   │   ├── report/             # レポートドメイン
│   │   ├── reservation/        # 予約ドメイン
│   │   └── user/               # 利用者ドメイン
│   ├── infrastructure/         # インフラ層（DB接続、Repository実装）
│   ├── shared/                 # 共通ユーティリティ
│   ├── scripts/                # 初期化スクリプト
│   └── e2e/                    # E2Eテスト
├── client/                     # フロントエンド（React SPA）
│   └── src/
│       ├── components/         # 再利用可能コンポーネント
│       ├── pages/              # ページコンポーネント
│       ├── routes/             # ルーティング設定
│       ├── contexts/           # React Context（認証など）
│       ├── lib/                # APIクライアント等
│       └── test/               # テスト設定
├── .devcontainer/              # Dev Container 設定
├── .kiro/                      # AI開発支援設定（Spec-Driven Development）
│   ├── specs/                  # 機能仕様
│   └── steering/               # プロジェクトガイドライン
├── docker-compose.yml          # PostgreSQL/Redis 設定
└── package.json                # バックエンド依存関係
```

> 📖 **プロジェクト構造の詳細**: [.kiro/steering/structure.md](.kiro/steering/structure.md)

## 環境変数

> 💡 **Dev Container 使用時**: 環境変数は自動設定されるため、通常は設定不要です。

| 変数名 | 説明 | デフォルト値 |
|--------|------|-------------|
| `POSTGRES_USER` | DBユーザー名 | `library_user` |
| `POSTGRES_PASSWORD` | DBパスワード | `library_password` |
| `POSTGRES_DB` | データベース名 | `library_db` |
| `POSTGRES_HOST` | DBホスト | `postgres` |
| `POSTGRES_PORT` | DBポート | `5432` |
| `REDIS_HOST` | Redisホスト | `redis` |
| `REDIS_PORT` | Redisポート | `6379` |
| `NODE_ENV` | 実行環境 | `development` |
| `PORT` | APIサーバーポート | `3000` |

### カスタマイズ

環境変数を変更する場合は、プロジェクトルートに `.env` ファイルを作成してください。

> ⚠️ **本番環境**: パスワードは必ず強力なものに変更し、シークレット管理サービスを使用してください。

## 開発ガイドライン

### 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| ファイル名 | kebab-case | `book-service.ts` |
| 型/インターフェース | PascalCase | `BookService`, `CreateBookInput` |
| 関数 | camelCase | `createBookService` |
| 定数 | UPPER_SNAKE_CASE | `MAX_LOAN_LIMIT` |
| テストファイル | `<source>.test.ts` | `book-service.test.ts` |

### コード規約

- TypeScript strict mode 有効
- すべての公開関数に明示的な戻り値型を指定
- `any` 型の使用禁止
- エラーハンドリングは `Result<T, E>` パターンを使用

> 📖 **詳細な開発規約**: [.kiro/steering/structure.md](.kiro/steering/structure.md)

### ブランチ戦略

| ブランチ | 用途 |
|----------|------|
| `main` | 本番環境にデプロイ可能な状態 |
| `feature/*` | 新機能開発 |
| `fix/*` | バグ修正 |
| `docs/*` | ドキュメント更新 |

### コミットメッセージ

```
<type>: <subject>

# 例:
# feat: 蔵書検索機能を追加
# fix: 貸出上限チェックのバグを修正
# docs: README にセットアップ手順を追加
```

## テスト

| 種類 | 対象 | 方針 |
|------|------|------|
| ユニットテスト | Service, Repository | 依存をモックして単体機能を検証 |
| 統合テスト | Controller | 実際のService/Repositoryを使用 |
| コンポーネントテスト | React Components | Testing Library でUI動作を検証 |
| E2Eテスト | エンドツーエンド | 全体フローの検証 |

テストファイルはソースファイルと**同じディレクトリ**に配置します（例: `book-service.test.ts`）。

```bash
# テスト実行
npm test              # バックエンド（watch mode）
npm run test:run      # バックエンド（単発）
cd client && npm test # フロントエンド
```

## ライセンス

このプロジェクトは [ISC License](https://opensource.org/licenses/ISC) の下で公開されています。

## コントリビューション

1. Issue を確認または作成
2. `feature/機能名` または `fix/バグ名` でブランチ作成
3. コードを変更し、テストを追加
4. `npm run lint && npm run test:run` で確認
5. `main` ブランチに向けて PR を作成

**リンク**: [Issues](https://github.com/DaisukeAsada/cc-sdd-trial/issues) | [Pull Requests](https://github.com/DaisukeAsada/cc-sdd-trial/pulls)
