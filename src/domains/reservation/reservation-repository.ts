/**
 * Reservation Repository Interface
 *
 * 予約データの永続化を担当するリポジトリのインターフェース定義。
 * 具体的な実装は Infrastructure 層で行います。
 */

import type { ReservationId, UserId, BookId } from '../../shared/branded-types.js';
import type { Result } from '../../shared/result.js';
import type {
  Reservation,
  CreateReservationInput,
  ReservationError,
  ReservationStatus,
} from './types.js';

// ============================================
// リポジトリインターフェース
// ============================================

/** 予約リポジトリ */
export interface ReservationRepository {
  /**
   * 新しい予約を作成
   * @param input - 予約作成入力
   * @param queuePosition - 予約キュー内の順番
   * @returns 作成された予約またはエラー
   */
  create(
    input: CreateReservationInput,
    queuePosition: number
  ): Promise<Result<Reservation, ReservationError>>;

  /**
   * IDで予約を取得
   * @param id - 予約ID
   * @returns 予約またはNOT_FOUNDエラー
   */
  findById(id: ReservationId): Promise<Result<Reservation, ReservationError>>;

  /**
   * 書籍IDでアクティブな予約一覧を取得（FIFO順）
   * @param bookId - 書籍ID
   * @returns アクティブな予約一覧（queuePosition順）
   */
  findActiveByBookId(bookId: BookId): Promise<Reservation[]>;

  /**
   * 書籍IDでアクティブな予約数を取得
   * @param bookId - 書籍ID
   * @returns アクティブな予約数
   */
  countActiveByBookId(bookId: BookId): Promise<number>;

  /**
   * ユーザーが特定の書籍に対してアクティブな予約を持っているかチェック
   * @param userId - ユーザーID
   * @param bookId - 書籍ID
   * @returns アクティブな予約がある場合true
   */
  hasActiveReservation(userId: UserId, bookId: BookId): Promise<boolean>;

  /**
   * 予約ステータスを更新
   * @param id - 予約ID
   * @param status - 新しいステータス
   * @param notifiedAt - 通知日時（NOTIFIED時）
   * @param expiresAt - 有効期限（NOTIFIED時）
   * @returns 更新された予約またはエラー
   */
  updateStatus(
    id: ReservationId,
    status: ReservationStatus,
    notifiedAt?: Date,
    expiresAt?: Date
  ): Promise<Result<Reservation, ReservationError>>;

  /**
   * ユーザーの予約一覧を取得
   * @param userId - ユーザーID
   * @returns ユーザーの予約一覧
   */
  findByUserId(userId: UserId): Promise<Reservation[]>;

  /**
   * 有効期限切れの予約一覧を取得（NOTIFIED状態で期限切れ）
   * @returns 有効期限切れの予約一覧
   */
  findExpiredReservations(): Promise<Reservation[]>;
}
