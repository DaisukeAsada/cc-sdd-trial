/**
 * ReservationController - 予約管理REST APIコントローラー
 *
 * 予約管理のREST APIエンドポイントを提供します。
 *
 * エンドポイント:
 * - POST /api/reservations - 予約作成
 * - DELETE /api/reservations/:id - 予約キャンセル
 * - GET /api/users/:id/reservations - 利用者の予約一覧
 */

import { Router, type Request, type Response } from 'express';
import type { ReservationId, UserId, BookId } from '../../shared/branded-types.js';
import { isOk } from '../../shared/result.js';
import type { ReservationService } from './reservation-service.js';
import type { ReservationRepository } from './reservation-repository.js';
import type { CreateReservationInput, ReservationError } from './types.js';

// ============================================
// リクエストボディ型定義
// ============================================

/** 予約作成リクエストボディ */
interface CreateReservationRequestBody {
  userId?: string;
  bookId?: string;
}

// ============================================
// HTTPステータスコード決定
// ============================================

/**
 * ReservationErrorに基づいてHTTPステータスコードを決定
 */
function getErrorStatusCode(error: ReservationError): number {
  switch (error.type) {
    case 'VALIDATION_ERROR':
      return 400;
    case 'USER_NOT_FOUND':
      return 404;
    case 'BOOK_NOT_FOUND':
      return 404;
    case 'RESERVATION_NOT_FOUND':
      return 404;
    case 'BOOK_AVAILABLE':
      return 409;
    case 'ALREADY_RESERVED':
      return 409;
  }
}

// ============================================
// コントローラーファクトリ
// ============================================

/**
 * ReservationControllerを作成
 * @param reservationService - ReservationServiceインスタンス
 * @param reservationRepository - ReservationRepositoryインスタンス（予約一覧取得用）
 * @returns Expressルーター
 */
export function createReservationController(
  reservationService: ReservationService,
  reservationRepository: Pick<ReservationRepository, 'findByUserId'>
): Router {
  const router = Router();

  // ============================================
  // POST /api/reservations - 予約作成
  // ============================================

  router.post('/reservations', async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateReservationRequestBody;

    // バリデーション: userIdが必須
    if (body.userId === undefined || body.userId === '') {
      res.status(400).json({
        error: {
          type: 'VALIDATION_ERROR',
          field: 'userId',
          message: '利用者IDは必須です',
        },
      });
      return;
    }

    // バリデーション: bookIdが必須
    if (body.bookId === undefined || body.bookId === '') {
      res.status(400).json({
        error: {
          type: 'VALIDATION_ERROR',
          field: 'bookId',
          message: '書籍IDは必須です',
        },
      });
      return;
    }

    const input: CreateReservationInput = {
      userId: body.userId as UserId,
      bookId: body.bookId as BookId,
    };

    const result = await reservationService.createReservation(input);

    if (isOk(result)) {
      res.status(201).json(result.value);
    } else {
      const statusCode = getErrorStatusCode(result.error);
      res.status(statusCode).json({ error: result.error });
    }
  });

  // ============================================
  // DELETE /api/reservations/:id - 予約キャンセル
  // ============================================

  router.delete('/reservations/:id', async (req: Request, res: Response): Promise<void> => {
    const reservationId = req.params.id as ReservationId;

    const result = await reservationService.cancelReservation(reservationId);

    if (isOk(result)) {
      res.status(204).send();
    } else {
      const statusCode = getErrorStatusCode(result.error);
      res.status(statusCode).json({ error: result.error });
    }
  });

  // ============================================
  // GET /api/users/:id/reservations - 利用者の予約一覧
  // ============================================

  router.get('/users/:id/reservations', async (req: Request, res: Response): Promise<void> => {
    const userId = req.params.id as UserId;

    const reservations = await reservationRepository.findByUserId(userId);

    res.status(200).json(reservations);
  });

  return router;
}
