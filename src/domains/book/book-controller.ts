/**
 * BookController - 蔵書管理REST APIコントローラー
 *
 * 蔵書管理のREST APIエンドポイントを提供します。
 *
 * エンドポイント:
 * - POST /api/books - 書籍登録
 * - PUT /api/books/:id - 書籍編集
 * - DELETE /api/books/:id - 書籍削除
 * - GET /api/books/:id - 書籍詳細取得
 * - POST /api/books/:id/copies - 蔵書コピー登録
 */

import { Router, type Request, type Response } from 'express';
import type { BookId } from '../../shared/branded-types.js';
import { isOk } from '../../shared/result.js';
import type { BookService } from './book-service.js';
import type { CreateBookInput, UpdateBookInput, CreateCopyInput, BookError } from './types.js';

// ============================================
// HTTPステータスコード決定
// ============================================

/**
 * BookErrorに基づいてHTTPステータスコードを決定
 */
function getErrorStatusCode(error: BookError): number {
  switch (error.type) {
    case 'VALIDATION_ERROR':
      return 400;
    case 'NOT_FOUND':
      return 404;
    case 'DUPLICATE_ISBN':
      return 409;
  }
}

// ============================================
// コントローラーファクトリ
// ============================================

/**
 * BookControllerを作成
 * @param bookService - BookServiceインスタンス
 * @returns Expressルーター
 */
export function createBookController(bookService: BookService): Router {
  const router = Router();

  // ============================================
  // POST /api/books - 書籍登録
  // ============================================

  router.post('/', async (req: Request, res: Response): Promise<void> => {
    const input: CreateBookInput = {
      title: req.body.title,
      author: req.body.author,
      publisher: req.body.publisher ?? null,
      publicationYear: req.body.publicationYear ?? null,
      isbn: req.body.isbn,
      category: req.body.category ?? null,
    };

    const result = await bookService.createBook(input);

    if (isOk(result)) {
      res.status(201).json(result.value);
    } else {
      const statusCode = getErrorStatusCode(result.error);
      res.status(statusCode).json({ error: result.error });
    }
  });

  // ============================================
  // PUT /api/books/:id - 書籍編集
  // ============================================

  router.put('/:id', async (req: Request, res: Response): Promise<void> => {
    const bookId = req.params['id'] as BookId;

    // 指定されたフィールドのみを更新対象に含める
    const input: UpdateBookInput = {
      ...(req.body.title !== undefined && { title: req.body.title }),
      ...(req.body.author !== undefined && { author: req.body.author }),
      ...(req.body.publisher !== undefined && { publisher: req.body.publisher }),
      ...(req.body.publicationYear !== undefined && { publicationYear: req.body.publicationYear }),
      ...(req.body.isbn !== undefined && { isbn: req.body.isbn }),
      ...(req.body.category !== undefined && { category: req.body.category }),
    };

    const result = await bookService.updateBook(bookId, input);

    if (isOk(result)) {
      res.status(200).json(result.value);
    } else {
      const statusCode = getErrorStatusCode(result.error);
      res.status(statusCode).json({ error: result.error });
    }
  });

  // ============================================
  // DELETE /api/books/:id - 書籍削除
  // ============================================

  router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
    const bookId = req.params['id'] as BookId;

    const result = await bookService.deleteBook(bookId);

    if (isOk(result)) {
      res.status(204).send();
    } else {
      const statusCode = getErrorStatusCode(result.error);
      res.status(statusCode).json({ error: result.error });
    }
  });

  // ============================================
  // GET /api/books/:id - 書籍詳細取得
  // ============================================

  router.get('/:id', async (req: Request, res: Response): Promise<void> => {
    const bookId = req.params['id'] as BookId;

    const result = await bookService.getBookById(bookId);

    if (isOk(result)) {
      res.status(200).json(result.value);
    } else {
      const statusCode = getErrorStatusCode(result.error);
      res.status(statusCode).json({ error: result.error });
    }
  });

  // ============================================
  // POST /api/books/:id/copies - 蔵書コピー登録
  // ============================================

  router.post('/:id/copies', async (req: Request, res: Response): Promise<void> => {
    const bookId = req.params['id'] as BookId;
    const input: CreateCopyInput = {
      location: req.body.location,
      status: req.body.status,
    };

    const result = await bookService.createBookCopy(bookId, input);

    if (isOk(result)) {
      res.status(201).json(result.value);
    } else {
      const statusCode = getErrorStatusCode(result.error);
      res.status(statusCode).json({ error: result.error });
    }
  });

  return router;
}
