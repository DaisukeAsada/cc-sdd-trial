/**
 * ReservationService - 予約管理サービス
 *
 * 予約の作成・キャンセル処理を提供します。
 */

import type { Result } from '../../shared/result.js';
import { err, ok } from '../../shared/result.js';
import type { BookId, ReservationId } from '../../shared/branded-types.js';
import type { ReservationRepository } from './reservation-repository.js';
import type { BookRepository } from '../book/book-repository.js';
import type { UserRepository } from '../user/user-repository.js';
import type { Reservation, CreateReservationInput, ReservationError } from './types.js';

// ============================================
// 結果型定義
// ============================================

/** 返却処理結果 */
export interface ProcessReturnedBookResult {
  /** 通知された予約（なければnull） */
  readonly notifiedReservation: Reservation | null;
}

/** 期限切れ予約処理結果 */
export interface ExpireReservationsResult {
  /** 期限切れとしてマークされた予約数 */
  readonly expiredCount: number;
  /** 次順位者に通知された予約 */
  readonly nextNotifiedReservations: Reservation[];
}

// ============================================
// 定数
// ============================================

/** 予約有効期限（日数） */
const RESERVATION_EXPIRY_DAYS = 7;

// ============================================
// サービスインターフェース
// ============================================

/** ReservationService インターフェース */
export interface ReservationService {
  /**
   * 新しい予約を作成
   * 貸出中の書籍に対してのみ予約可能
   * @param input - 予約作成入力（userId, bookId）
   * @returns 作成された予約またはエラー
   */
  createReservation(input: CreateReservationInput): Promise<Result<Reservation, ReservationError>>;

  /**
   * 返却された書籍の予約処理
   * 予約キューの先頭予約者に通知し、有効期限を設定
   * @param bookId - 返却された書籍ID
   * @returns 通知された予約情報
   */
  processReturnedBook(bookId: BookId): Promise<Result<ProcessReturnedBookResult, never>>;

  /**
   * 有効期限切れ予約の処理
   * 期限切れ予約をEXPIRED状態に更新し、次順位者に通知
   * @returns 処理結果（期限切れ数、次順位通知リスト）
   */
  expireOverdueReservations(): Promise<Result<ExpireReservationsResult, never>>;

  /**
   * 予約をキャンセル
   * @param reservationId - キャンセルする予約ID
   * @returns 成功またはエラー
   */
  cancelReservation(reservationId: ReservationId): Promise<Result<void, ReservationError>>;
}

// ============================================
// サービス実装
// ============================================

/** ReservationService 実装を作成 */
export function createReservationService(
  reservationRepository: ReservationRepository,
  bookRepository: Pick<BookRepository, 'findById' | 'findCopiesByBookId'>,
  userRepository: Pick<UserRepository, 'findById'>
): ReservationService {
  /**
   * 予約者に通知を送信し、有効期限を設定
   */
  async function notifyReservation(reservation: Reservation): Promise<Reservation | null> {
    const notifiedAt = new Date();
    const expiresAt = new Date(notifiedAt);
    expiresAt.setDate(expiresAt.getDate() + RESERVATION_EXPIRY_DAYS);

    const updateResult = await reservationRepository.updateStatus(
      reservation.id,
      'NOTIFIED',
      notifiedAt,
      expiresAt
    );

    if (updateResult.success) {
      return updateResult.value;
    }
    return null;
  }

  return {
    async createReservation(
      input: CreateReservationInput
    ): Promise<Result<Reservation, ReservationError>> {
      const { userId, bookId } = input;

      // 1. 利用者の存在確認
      const userResult = await userRepository.findById(userId);
      if (!userResult.success) {
        return err({
          type: 'USER_NOT_FOUND',
          userId: userId,
        });
      }

      // 2. 書籍の存在確認
      const bookResult = await bookRepository.findById(bookId);
      if (!bookResult.success) {
        return err({
          type: 'BOOK_NOT_FOUND',
          bookId: bookId,
        });
      }

      // 3. 同一ユーザーによる同一書籍への重複予約チェック
      const hasExisting = await reservationRepository.hasActiveReservation(userId, bookId);
      if (hasExisting) {
        return err({
          type: 'ALREADY_RESERVED',
          userId: userId,
          bookId: bookId,
        });
      }

      // 4. 書籍の蔵書コピーの状態を確認（すべて貸出可能なら予約不可）
      const copiesResult = await bookRepository.findCopiesByBookId(bookId);
      if (!copiesResult.success) {
        return err({
          type: 'BOOK_NOT_FOUND',
          bookId: bookId,
        });
      }
      const copies = copiesResult.value;

      // すべてのコピーが AVAILABLE なら予約不可（貸出可能な本は予約できない）
      const hasAvailableCopy = copies.some((copy) => copy.status === 'AVAILABLE');
      if (hasAvailableCopy) {
        return err({
          type: 'BOOK_AVAILABLE',
          bookId: bookId,
        });
      }

      // 5. 予約キュー内の順番を計算（既存の予約数 + 1）
      const currentQueueCount = await reservationRepository.countActiveByBookId(bookId);
      const queuePosition = currentQueueCount + 1;

      // 6. 予約を作成
      const reservationResult = await reservationRepository.create(input, queuePosition);

      return reservationResult;
    },

    async processReturnedBook(bookId: BookId): Promise<Result<ProcessReturnedBookResult, never>> {
      // 1. 該当書籍のアクティブな予約一覧を取得（FIFO順）
      const reservations = await reservationRepository.findActiveByBookId(bookId);

      // 2. 予約がなければ通知対象なし
      if (reservations.length === 0) {
        return ok({ notifiedReservation: null });
      }

      // 3. 先頭の予約者（PENDING状態のもの）に通知
      const firstPendingReservation = reservations.find((r) => r.status === 'PENDING');
      if (firstPendingReservation == null) {
        return ok({ notifiedReservation: null });
      }

      // 4. 通知処理
      const notifiedReservation = await notifyReservation(firstPendingReservation);

      return ok({ notifiedReservation });
    },

    async expireOverdueReservations(): Promise<Result<ExpireReservationsResult, never>> {
      // 1. 有効期限切れの予約を取得
      const expiredReservations = await reservationRepository.findExpiredReservations();

      // 2. 期限切れ予約がなければ終了
      if (expiredReservations.length === 0) {
        return ok({
          expiredCount: 0,
          nextNotifiedReservations: [],
        });
      }

      const nextNotifiedReservations: Reservation[] = [];
      const processedBookIds = new Set<string>();

      // 3. 各期限切れ予約を処理
      for (const reservation of expiredReservations) {
        // EXPIRED状態に更新
        await reservationRepository.updateStatus(reservation.id, 'EXPIRED');

        // 同一書籍の次順位予約者に通知（書籍ごとに1回のみ）
        if (!processedBookIds.has(reservation.bookId)) {
          processedBookIds.add(reservation.bookId);

          // 次の予約者を取得
          const activeReservations = await reservationRepository.findActiveByBookId(
            reservation.bookId
          );
          const nextPending = activeReservations.find((r) => r.status === 'PENDING');

          if (nextPending != null) {
            const notified = await notifyReservation(nextPending);
            if (notified != null) {
              nextNotifiedReservations.push(notified);
            }
          }
        }
      }

      return ok({
        expiredCount: expiredReservations.length,
        nextNotifiedReservations,
      });
    },

    async cancelReservation(reservationId: ReservationId): Promise<Result<void, ReservationError>> {
      // 1. 予約の存在確認
      const reservationResult = await reservationRepository.findById(reservationId);
      if (!reservationResult.success) {
        return err(reservationResult.error);
      }

      // 2. CANCELLEDステータスに更新
      const updateResult = await reservationRepository.updateStatus(reservationId, 'CANCELLED');
      if (!updateResult.success) {
        return err(updateResult.error);
      }

      return ok(undefined);
    },
  };
}
