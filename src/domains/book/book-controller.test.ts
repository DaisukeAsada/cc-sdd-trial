/**
 * BookController テスト
 *
 * 蔵書管理REST APIエンドポイントのテスト。
 * TDDアプローチ: RED -> GREEN -> REFACTOR
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { createBookController } from './book-controller.js';
import type { BookService } from './book-service.js';
import type { Book, BookCopy } from './types.js';
import type { BookId, CopyId } from '../../shared/branded-types.js';
import { ok, err } from '../../shared/result.js';

// ============================================
// モックヘルパー
// ============================================

function createMockBookService(): BookService {
  return {
    createBook: vi.fn(),
    getBookById: vi.fn(),
    updateBook: vi.fn(),
    deleteBook: vi.fn(),
    createBookCopy: vi.fn(),
    updateCopyStatus: vi.fn(),
    getCopiesByBookId: vi.fn(),
  };
}

function createTestApp(bookService: BookService): Express {
  const app = express();
  app.use(express.json());
  const router = createBookController(bookService);
  app.use('/api/books', router);
  return app;
}

function createTestBook(overrides?: Partial<Book>): Book {
  return {
    id: 'book-1' as BookId,
    title: 'Test Book',
    author: 'Test Author',
    publisher: 'Test Publisher',
    publicationYear: 2024,
    isbn: '9784123456789',
    category: 'Fiction',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function createTestBookCopy(overrides?: Partial<BookCopy>): BookCopy {
  return {
    id: 'copy-1' as CopyId,
    bookId: 'book-1' as BookId,
    location: 'Shelf A-1',
    status: 'AVAILABLE',
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

// ============================================
// テスト
// ============================================

describe('BookController', () => {
  let mockService: BookService;
  let app: Express;

  beforeEach(() => {
    mockService = createMockBookService();
    app = createTestApp(mockService);
  });

  // ============================================
  // POST /api/books - 書籍登録
  // ============================================

  describe('POST /api/books - 書籍登録', () => {
    it('正常系: 書籍を登録して201を返す', async () => {
      const book = createTestBook();
      vi.mocked(mockService.createBook).mockResolvedValue(ok(book));

      const response = await request(app)
        .post('/api/books')
        .send({
          title: 'Test Book',
          author: 'Test Author',
          publisher: 'Test Publisher',
          publicationYear: 2024,
          isbn: '9784123456789',
          category: 'Fiction',
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBe('book-1');
      expect(response.body.title).toBe('Test Book');
      expect(mockService.createBook).toHaveBeenCalledTimes(1);
    });

    it('異常系: バリデーションエラーで400を返す', async () => {
      vi.mocked(mockService.createBook).mockResolvedValue(
        err({ type: 'VALIDATION_ERROR', field: 'title', message: 'title is required' })
      );

      const response = await request(app)
        .post('/api/books')
        .send({ isbn: '9784123456789' });

      expect(response.status).toBe(400);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
      expect(response.body.error.field).toBe('title');
    });

    it('異常系: ISBN重複で409を返す', async () => {
      vi.mocked(mockService.createBook).mockResolvedValue(
        err({ type: 'DUPLICATE_ISBN', isbn: '9784123456789' })
      );

      const response = await request(app)
        .post('/api/books')
        .send({
          title: 'Test Book',
          author: 'Test Author',
          isbn: '9784123456789',
        });

      expect(response.status).toBe(409);
      expect(response.body.error.type).toBe('DUPLICATE_ISBN');
    });
  });

  // ============================================
  // PUT /api/books/:id - 書籍編集
  // ============================================

  describe('PUT /api/books/:id - 書籍編集', () => {
    it('正常系: 書籍を編集して200を返す', async () => {
      const updatedBook = createTestBook({ title: 'Updated Title' });
      vi.mocked(mockService.updateBook).mockResolvedValue(ok(updatedBook));

      const response = await request(app)
        .put('/api/books/book-1')
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated Title');
      expect(mockService.updateBook).toHaveBeenCalledWith('book-1', { title: 'Updated Title' });
    });

    it('異常系: 存在しない書籍で404を返す', async () => {
      vi.mocked(mockService.updateBook).mockResolvedValue(
        err({ type: 'NOT_FOUND', id: 'book-999' })
      );

      const response = await request(app)
        .put('/api/books/book-999')
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(404);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });

    it('異常系: バリデーションエラーで400を返す', async () => {
      vi.mocked(mockService.updateBook).mockResolvedValue(
        err({ type: 'VALIDATION_ERROR', field: 'title', message: 'title cannot be empty' })
      );

      const response = await request(app)
        .put('/api/books/book-1')
        .send({ title: '' });

      expect(response.status).toBe(400);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });
  });

  // ============================================
  // DELETE /api/books/:id - 書籍削除
  // ============================================

  describe('DELETE /api/books/:id - 書籍削除', () => {
    it('正常系: 書籍を削除して204を返す', async () => {
      vi.mocked(mockService.deleteBook).mockResolvedValue(ok(undefined));

      const response = await request(app)
        .delete('/api/books/book-1');

      expect(response.status).toBe(204);
      expect(mockService.deleteBook).toHaveBeenCalledWith('book-1');
    });

    it('異常系: 存在しない書籍で404を返す', async () => {
      vi.mocked(mockService.deleteBook).mockResolvedValue(
        err({ type: 'NOT_FOUND', id: 'book-999' })
      );

      const response = await request(app)
        .delete('/api/books/book-999');

      expect(response.status).toBe(404);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });
  });

  // ============================================
  // GET /api/books/:id - 書籍詳細取得
  // ============================================

  describe('GET /api/books/:id - 書籍詳細取得', () => {
    it('正常系: 書籍詳細を取得して200を返す', async () => {
      const book = createTestBook();
      vi.mocked(mockService.getBookById).mockResolvedValue(ok(book));

      const response = await request(app)
        .get('/api/books/book-1');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('book-1');
      expect(response.body.title).toBe('Test Book');
      expect(mockService.getBookById).toHaveBeenCalledWith('book-1');
    });

    it('異常系: 存在しない書籍で404を返す', async () => {
      vi.mocked(mockService.getBookById).mockResolvedValue(
        err({ type: 'NOT_FOUND', id: 'book-999' })
      );

      const response = await request(app)
        .get('/api/books/book-999');

      expect(response.status).toBe(404);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });
  });

  // ============================================
  // POST /api/books/:id/copies - 蔵書コピー登録
  // ============================================

  describe('POST /api/books/:id/copies - 蔵書コピー登録', () => {
    it('正常系: 蔵書コピーを登録して201を返す', async () => {
      const copy = createTestBookCopy();
      vi.mocked(mockService.createBookCopy).mockResolvedValue(ok(copy));

      const response = await request(app)
        .post('/api/books/book-1/copies')
        .send({
          location: 'Shelf A-1',
          status: 'AVAILABLE',
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBe('copy-1');
      expect(response.body.location).toBe('Shelf A-1');
      expect(mockService.createBookCopy).toHaveBeenCalledWith('book-1', {
        location: 'Shelf A-1',
        status: 'AVAILABLE',
      });
    });

    it('異常系: 存在しない書籍で404を返す', async () => {
      vi.mocked(mockService.createBookCopy).mockResolvedValue(
        err({ type: 'NOT_FOUND', id: 'book-999' })
      );

      const response = await request(app)
        .post('/api/books/book-999/copies')
        .send({ location: 'Shelf A-1' });

      expect(response.status).toBe(404);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });

    it('異常系: バリデーションエラーで400を返す', async () => {
      vi.mocked(mockService.createBookCopy).mockResolvedValue(
        err({ type: 'VALIDATION_ERROR', field: 'location', message: 'location is required' })
      );

      const response = await request(app)
        .post('/api/books/book-1/copies')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });
  });
});
