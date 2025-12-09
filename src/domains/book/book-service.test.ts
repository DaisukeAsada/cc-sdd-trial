/**
 * BookService Unit Tests
 *
 * TDD: RED → GREEN → REFACTOR
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BookService, createBookService } from './book-service.js';
import type { BookRepository } from './book-repository.js';
import type { Book, CreateBookInput, UpdateBookInput } from './types.js';
import { createBookId } from '../../shared/branded-types.js';
import { ok, err, isOk, isErr } from '../../shared/result.js';

// ============================================
// モックリポジトリ作成ヘルパー
// ============================================

function createMockRepository(
  overrides: Partial<BookRepository> = {}
): BookRepository {
  return {
    create: vi.fn().mockResolvedValue(ok(createMockBook())),
    findById: vi.fn().mockResolvedValue(ok(createMockBook())),
    findByIsbn: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(ok(createMockBook())),
    delete: vi.fn().mockResolvedValue(ok(undefined)),
    ...overrides,
  };
}

function createMockBook(overrides: Partial<Book> = {}): Book {
  return {
    id: createBookId('book-123'),
    title: 'テスト書籍',
    author: 'テスト著者',
    publisher: 'テスト出版社',
    publicationYear: 2024,
    isbn: '978-4-12-345678-4',
    category: 'プログラミング',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

// ============================================
// createBook テスト
// ============================================

describe('BookService.createBook', () => {
  let service: BookService;
  let mockRepository: BookRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = createBookService(mockRepository);
  });

  describe('正常系', () => {
    it('有効な入力で書籍を登録できる', async () => {
      const input: CreateBookInput = {
        title: 'テスト書籍',
        author: 'テスト著者',
        isbn: '978-4-12-345678-4',
        publisher: 'テスト出版社',
        publicationYear: 2024,
        category: 'プログラミング',
      };

      const result = await service.createBook(input);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.title).toBe('テスト書籍');
        expect(result.value.author).toBe('テスト著者');
        expect(result.value.isbn).toBe('978-4-12-345678-4');
      }
    });

    it('オプション項目がnullでも登録できる', async () => {
      const input: CreateBookInput = {
        title: 'テスト書籍',
        author: 'テスト著者',
        isbn: '978-4-12-345678-4',
      };

      const result = await service.createBook(input);

      expect(isOk(result)).toBe(true);
    });
  });

  describe('バリデーションエラー', () => {
    it('タイトルが空の場合はVALIDATION_ERRORを返す', async () => {
      const input: CreateBookInput = {
        title: '',
        author: 'テスト著者',
        isbn: '978-4-12-345678-4',
      };

      const result = await service.createBook(input);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe('VALIDATION_ERROR');
        if (result.error.type === 'VALIDATION_ERROR') {
          expect(result.error.field).toBe('title');
        }
      }
    });

    it('著者が空の場合はVALIDATION_ERRORを返す', async () => {
      const input: CreateBookInput = {
        title: 'テスト書籍',
        author: '',
        isbn: '978-4-12-345678-4',
      };

      const result = await service.createBook(input);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe('VALIDATION_ERROR');
        if (result.error.type === 'VALIDATION_ERROR') {
          expect(result.error.field).toBe('author');
        }
      }
    });

    it('ISBNが空の場合はVALIDATION_ERRORを返す', async () => {
      const input: CreateBookInput = {
        title: 'テスト書籍',
        author: 'テスト著者',
        isbn: '',
      };

      const result = await service.createBook(input);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe('VALIDATION_ERROR');
        if (result.error.type === 'VALIDATION_ERROR') {
          expect(result.error.field).toBe('isbn');
        }
      }
    });

    it('ISBN形式が不正な場合はVALIDATION_ERRORを返す', async () => {
      const input: CreateBookInput = {
        title: 'テスト書籍',
        author: 'テスト著者',
        isbn: 'invalid-isbn',
      };

      const result = await service.createBook(input);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe('VALIDATION_ERROR');
        if (result.error.type === 'VALIDATION_ERROR') {
          expect(result.error.field).toBe('isbn');
        }
      }
    });
  });

  describe('ISBN重複チェック', () => {
    it('既存のISBNで登録しようとするとDUPLICATE_ISBNエラーを返す', async () => {
      const existingBook = createMockBook({ isbn: '978-4-12-345678-4' });
      mockRepository = createMockRepository({
        findByIsbn: vi.fn().mockResolvedValue(existingBook),
      });
      service = createBookService(mockRepository);

      const input: CreateBookInput = {
        title: '新しい書籍',
        author: '別の著者',
        isbn: '978-4-12-345678-4',
      };

      const result = await service.createBook(input);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe('DUPLICATE_ISBN');
        if (result.error.type === 'DUPLICATE_ISBN') {
          expect(result.error.isbn).toBe('978-4-12-345678-4');
        }
      }
    });
  });
});

// ============================================
// getBookById テスト
// ============================================

describe('BookService.getBookById', () => {
  let service: BookService;
  let mockRepository: BookRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = createBookService(mockRepository);
  });

  it('存在する書籍IDで書籍を取得できる', async () => {
    const bookId = createBookId('book-123');
    const expectedBook = createMockBook({ id: bookId });
    mockRepository = createMockRepository({
      findById: vi.fn().mockResolvedValue(ok(expectedBook)),
    });
    service = createBookService(mockRepository);

    const result = await service.getBookById(bookId);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.id).toBe(bookId);
    }
  });

  it('存在しない書籍IDはNOT_FOUNDエラーを返す', async () => {
    const bookId = createBookId('non-existent');
    mockRepository = createMockRepository({
      findById: vi.fn().mockResolvedValue(
        err({ type: 'NOT_FOUND' as const, id: 'non-existent' })
      ),
    });
    service = createBookService(mockRepository);

    const result = await service.getBookById(bookId);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.type).toBe('NOT_FOUND');
    }
  });
});

// ============================================
// updateBook テスト
// ============================================

describe('BookService.updateBook', () => {
  let service: BookService;
  let mockRepository: BookRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = createBookService(mockRepository);
  });

  it('有効な入力で書籍を更新できる', async () => {
    const bookId = createBookId('book-123');
    const updatedBook = createMockBook({
      id: bookId,
      title: '更新後のタイトル',
      updatedAt: new Date(),
    });
    mockRepository = createMockRepository({
      findById: vi.fn().mockResolvedValue(ok(createMockBook({ id: bookId }))),
      update: vi.fn().mockResolvedValue(ok(updatedBook)),
    });
    service = createBookService(mockRepository);

    const input: UpdateBookInput = {
      title: '更新後のタイトル',
    };

    const result = await service.updateBook(bookId, input);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.title).toBe('更新後のタイトル');
    }
  });

  it('存在しない書籍IDはNOT_FOUNDエラーを返す', async () => {
    const bookId = createBookId('non-existent');
    mockRepository = createMockRepository({
      findById: vi.fn().mockResolvedValue(
        err({ type: 'NOT_FOUND' as const, id: 'non-existent' })
      ),
    });
    service = createBookService(mockRepository);

    const input: UpdateBookInput = {
      title: '更新後のタイトル',
    };

    const result = await service.updateBook(bookId, input);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.type).toBe('NOT_FOUND');
    }
  });

  it('タイトルを空に更新しようとするとVALIDATION_ERRORを返す', async () => {
    const bookId = createBookId('book-123');
    mockRepository = createMockRepository({
      findById: vi.fn().mockResolvedValue(ok(createMockBook({ id: bookId }))),
    });
    service = createBookService(mockRepository);

    const input: UpdateBookInput = {
      title: '',
    };

    const result = await service.updateBook(bookId, input);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.type).toBe('VALIDATION_ERROR');
    }
  });

  it('ISBN更新時に既存ISBNと重複する場合はDUPLICATE_ISBNエラーを返す', async () => {
    const bookId = createBookId('book-123');
    const existingBook = createMockBook({
      id: createBookId('book-456'),
      isbn: '978-4-99-999999-6',
    });
    mockRepository = createMockRepository({
      findById: vi.fn().mockResolvedValue(ok(createMockBook({ id: bookId }))),
      findByIsbn: vi.fn().mockResolvedValue(existingBook),
    });
    service = createBookService(mockRepository);

    const input: UpdateBookInput = {
      isbn: '978-4-99-999999-6',
    };

    const result = await service.updateBook(bookId, input);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.type).toBe('DUPLICATE_ISBN');
    }
  });
});

// ============================================
// deleteBook テスト
// ============================================

describe('BookService.deleteBook', () => {
  let service: BookService;
  let mockRepository: BookRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = createBookService(mockRepository);
  });

  it('存在する書籍を削除できる', async () => {
    const bookId = createBookId('book-123');
    mockRepository = createMockRepository({
      findById: vi.fn().mockResolvedValue(ok(createMockBook({ id: bookId }))),
      delete: vi.fn().mockResolvedValue(ok(undefined)),
    });
    service = createBookService(mockRepository);

    const result = await service.deleteBook(bookId);

    expect(isOk(result)).toBe(true);
  });

  it('存在しない書籍IDはNOT_FOUNDエラーを返す', async () => {
    const bookId = createBookId('non-existent');
    mockRepository = createMockRepository({
      findById: vi.fn().mockResolvedValue(
        err({ type: 'NOT_FOUND' as const, id: 'non-existent' })
      ),
    });
    service = createBookService(mockRepository);

    const result = await service.deleteBook(bookId);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.type).toBe('NOT_FOUND');
    }
  });
});
