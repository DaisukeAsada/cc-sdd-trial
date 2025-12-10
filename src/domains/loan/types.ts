/**
 * Loan Domain - 型定義
 *
 * 貸出管理ドメインの型定義を提供します。
 */

import type { LoanId, UserId, CopyId } from '../../shared/branded-types.js';

// ============================================
// 貸出型定義
// ============================================

/** 貸出 */
export interface Loan {
  readonly id: LoanId;
  readonly userId: UserId;
  readonly bookCopyId: CopyId;
  readonly borrowedAt: Date;
  readonly dueDate: Date;
  readonly returnedAt: Date | null;
}

/** 貸出作成入力 */
export interface CreateLoanInput {
  readonly userId: UserId;
  readonly bookCopyId: CopyId;
}

// ============================================
// 返却期限設定
// ============================================

/** デフォルト貸出期間（日数） */
export const DEFAULT_LOAN_DURATION_DAYS = 14;

// ============================================
// 貸出レシート
// ============================================

/** 貸出レシート（貸出完了時に発行） */
export interface LoanReceipt {
  readonly loan: Loan;
  readonly bookTitle: string;
  readonly userName: string;
}

// ============================================
// 返却結果
// ============================================

/** 返却結果 */
export interface ReturnResult {
  readonly loan: Loan;
  readonly isOverdue: boolean;
  readonly overdueDays?: number;
  readonly overdueRecord?: OverdueRecord;
}

// ============================================
// 延滞記録型定義
// ============================================

/** 延滞記録ID */
import type { OverdueRecordId } from '../../shared/branded-types.js';

/** 延滞記録 */
export interface OverdueRecord {
  readonly id: OverdueRecordId;
  readonly loanId: LoanId;
  readonly overdueDays: number;
  readonly recordedAt: Date;
}

/** 延滞記録作成入力 */
export interface CreateOverdueRecordInput {
  readonly loanId: LoanId;
  readonly overdueDays: number;
}

// ============================================
// 貸出状況型定義
// ============================================

/** 蔵書コピーの貸出状況 */
export interface CopyLoanStatus {
  /** 貸出中かどうか */
  readonly isBorrowed: boolean;
  /** 貸出情報（貸出中の場合のみ） */
  readonly loan: Loan | null;
  /** 返却期限（貸出中の場合のみ） */
  readonly dueDate: Date | null;
}

// ============================================
// エラー型定義
// ============================================

/** 貸出ドメインエラー */
export type LoanError =
  | { readonly type: 'VALIDATION_ERROR'; readonly field: string; readonly message: string }
  | { readonly type: 'BOOK_NOT_AVAILABLE'; readonly copyId: string }
  | {
      readonly type: 'LOAN_LIMIT_EXCEEDED';
      readonly userId: string;
      readonly limit: number;
      readonly currentCount: number;
    }
  | { readonly type: 'USER_NOT_FOUND'; readonly userId: string }
  | { readonly type: 'COPY_NOT_FOUND'; readonly copyId: string }
  | { readonly type: 'LOAN_NOT_FOUND'; readonly loanId: string }
  | { readonly type: 'ALREADY_RETURNED'; readonly loanId: string };
