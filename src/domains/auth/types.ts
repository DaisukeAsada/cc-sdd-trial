/**
 * Auth Domain - 型定義
 *
 * 認証・認可ドメインの型定義を提供します。
 */

import type { UserId } from '../../shared/branded-types.js';

// ============================================
// セッション型定義
// ============================================

/** セッションID */
export type SessionId = string & { readonly brand: unique symbol };

/** ユーザーロール */
export type UserRole = 'librarian' | 'patron' | 'admin';

/** セッションデータ */
export interface SessionData {
  readonly userId: UserId;
  readonly role: UserRole;
  readonly createdAt: Date;
  readonly expiresAt: Date;
}

/** セッション（IDを含む） */
export interface Session {
  readonly id: SessionId;
  readonly data: SessionData;
}

/** ログイン入力 */
export interface LoginInput {
  readonly email: string;
  readonly password: string;
}

/** ログイン結果 */
export interface LoginResult {
  readonly session: Session;
  readonly user: {
    readonly id: UserId;
    readonly name: string;
    readonly email: string;
    readonly role: UserRole;
  };
}

// ============================================
// 認証ストア設定
// ============================================

/** セッションストア設定 */
export interface SessionStoreConfig {
  /** Redis接続URL */
  readonly redisUrl: string;
  /** セッション有効期限（秒） */
  readonly sessionTtlSeconds: number;
  /** セッションプレフィックス（Redisキー） */
  readonly keyPrefix?: string;
}

/** デフォルトセッション有効期限（24時間） */
export const DEFAULT_SESSION_TTL_SECONDS = 24 * 60 * 60;

/** デフォルトセッションキープレフィックス */
export const DEFAULT_SESSION_KEY_PREFIX = 'session:';

// ============================================
// エラー型定義
// ============================================

/** 認証エラー */
export type AuthError =
  | { readonly type: 'INVALID_CREDENTIALS'; readonly message: string }
  | { readonly type: 'SESSION_NOT_FOUND'; readonly sessionId: string }
  | { readonly type: 'SESSION_EXPIRED'; readonly sessionId: string }
  | { readonly type: 'USER_NOT_FOUND'; readonly email: string }
  | { readonly type: 'STORE_ERROR'; readonly message: string };
