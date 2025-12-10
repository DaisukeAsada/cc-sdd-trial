/**
 * LoanController - 貸出管理REST APIコントローラー
 *
 * 貸出管理のREST APIエンドポイントを提供します。
 *
 * エンドポイント:
 * - POST /api/loans - 貸出処理
 * - GET /api/loans/:id - 貸出詳細
 */

import { Router, type Request, type Response } from 'express';
import type { LoanId, UserId, CopyId } from '../../shared/branded-types.js';
import { isOk } from '../../shared/result.js';
import type { LoanService } from './loan-service.js';
import type { CreateLoanInput, LoanError } from './types.js';

// ============================================
// リクエストボディ型定義
// ============================================

/** 貸出リクエストボディ */
interface CreateLoanRequestBody {
  userId?: string;
  bookCopyId?: string;
}

// ============================================
// HTTPステータスコード決定
// ============================================

/**
 * LoanErrorに基づいてHTTPステータスコードを決定
 */
function getErrorStatusCode(error: LoanError): number {
  switch (error.type) {
    case 'VALIDATION_ERROR':
      return 400;
    case 'USER_NOT_FOUND':
      return 404;
    case 'COPY_NOT_FOUND':
      return 404;
    case 'LOAN_NOT_FOUND':
      return 404;
    case 'BOOK_NOT_AVAILABLE':
      return 409;
    case 'LOAN_LIMIT_EXCEEDED':
      return 409;
    case 'ALREADY_RETURNED':
      return 409;
  }
}

// ============================================
// コントローラーファクトリ
// ============================================

/**
 * LoanControllerを作成
 * @param loanService - LoanServiceインスタンス
 * @returns Expressルーター
 */
export function createLoanController(loanService: LoanService): Router {
  const router = Router();

  // ============================================
  // POST /api/loans - 貸出処理
  // ============================================

  router.post('/', async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateLoanRequestBody;

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

    // バリデーション: bookCopyIdが必須
    if (body.bookCopyId === undefined || body.bookCopyId === '') {
      res.status(400).json({
        error: {
          type: 'VALIDATION_ERROR',
          field: 'bookCopyId',
          message: '蔵書コピーIDは必須です',
        },
      });
      return;
    }

    const input: CreateLoanInput = {
      userId: body.userId as UserId,
      bookCopyId: body.bookCopyId as CopyId,
    };

    const result = await loanService.createLoanWithReceipt(input);

    if (isOk(result)) {
      res.status(201).json(result.value);
    } else {
      const statusCode = getErrorStatusCode(result.error);
      res.status(statusCode).json({ error: result.error });
    }
  });

  // ============================================
  // GET /api/loans/:id - 貸出詳細
  // ============================================

  router.get('/:id', async (req: Request, res: Response): Promise<void> => {
    const loanId = req.params.id as LoanId;

    const result = await loanService.getLoanById(loanId);

    if (isOk(result)) {
      res.status(200).json(result.value);
    } else {
      const statusCode = getErrorStatusCode(result.error);
      res.status(statusCode).json({ error: result.error });
    }
  });

  return router;
}
