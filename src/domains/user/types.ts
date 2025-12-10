/**
 * User Domain - 型定義
 *
 * 利用者管理ドメインの型定義を提供します。
 */

import type { UserId } from '../../shared/branded-types.js';

// ============================================
// 利用者型定義
// ============================================

/** 利用者 */
export interface User {
  readonly id: UserId;
  readonly name: string;
  readonly address: string | null;
  readonly email: string;
  readonly phone: string | null;
  readonly registeredAt: Date;
  readonly loanLimit: number;
}

/** 利用者登録入力 */
export interface CreateUserInput {
  readonly name: string;
  readonly address?: string | null;
  readonly email: string;
  readonly phone?: string | null;
  readonly loanLimit?: number;
}

/** 利用者更新入力 */
export interface UpdateUserInput {
  readonly name?: string;
  readonly address?: string | null;
  readonly email?: string;
  readonly phone?: string | null;
  readonly loanLimit?: number;
}

// ============================================
// エラー型定義
// ============================================

/** 利用者ドメインエラー */
export type UserError =
  | { readonly type: 'VALIDATION_ERROR'; readonly field: string; readonly message: string }
  | { readonly type: 'DUPLICATE_EMAIL'; readonly email: string }
  | { readonly type: 'NOT_FOUND'; readonly id: string };

/** デフォルト貸出上限 */
export const DEFAULT_LOAN_LIMIT = 5;
