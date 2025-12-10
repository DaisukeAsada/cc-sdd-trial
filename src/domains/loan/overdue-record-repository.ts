/**
 * OverdueRecordRepository Interface
 *
 * 延滞記録データの永続化を担当するリポジトリのインターフェース定義。
 * 具体的な実装は Infrastructure 層で行います。
 */

import type { LoanId, UserId, OverdueRecordId } from '../../shared/branded-types.js';
import type { Result } from '../../shared/result.js';
import type { OverdueRecord, CreateOverdueRecordInput } from './types.js';

// ============================================
// エラー型
// ============================================

/** 延滞記録リポジトリエラー */
export type OverdueRecordRepositoryError =
  | { readonly type: 'NOT_FOUND'; readonly id: string }
  | { readonly type: 'DATABASE_ERROR'; readonly message: string };

// ============================================
// リポジトリインターフェース
// ============================================

/** 延滞記録リポジトリ */
export interface OverdueRecordRepository {
  /**
   * 延滞記録を作成
   * @param input - 延滞記録作成入力
   * @returns 作成された延滞記録またはエラー
   */
  create(
    input: CreateOverdueRecordInput
  ): Promise<Result<OverdueRecord, OverdueRecordRepositoryError>>;

  /**
   * IDで延滞記録を取得
   * @param id - 延滞記録ID
   * @returns 延滞記録またはNOT_FOUNDエラー
   */
  findById(id: OverdueRecordId): Promise<Result<OverdueRecord, OverdueRecordRepositoryError>>;

  /**
   * 貸出IDで延滞記録を取得
   * @param loanId - 貸出ID
   * @returns 延滞記録またはnull
   */
  findByLoanId(loanId: LoanId): Promise<OverdueRecord | null>;

  /**
   * 利用者の延滞記録一覧を取得
   * @param userId - 利用者ID
   * @returns 延滞記録の配列
   */
  findByUserId(userId: UserId): Promise<OverdueRecord[]>;
}
