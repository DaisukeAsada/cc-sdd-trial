/**
 * SearchService Unit Tests
 *
 * TDD: RED → GREEN → REFACTOR
 * Task 3.1: 検索サービスの実装
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SearchService } from './search-service.js';
import { createSearchService } from './search-service.js';
import type { SearchRepository, SearchBooksResult } from './search-repository.js';
import type { Book } from './types.js';
import { createBookId } from '../../shared/branded-types.js';
import type { Result } from '../../shared/result.js';
import { isOk } from '../../shared/result.js';

// ============================================
// モックリポジトリ作成ヘルパー
// ============================================

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

function createMockSearchRepository(
  overrides: Partial<SearchRepository> = {}
): SearchRepository {
  return {
    search: vi.fn().mockResolvedValue({
      books: [],
      total: 0,
    }),
    ...overrides,
  };
}

// ============================================
// search テスト
// ============================================

describe('SearchService.search', () => {
  let service: SearchService;
  let mockRepository: SearchRepository;

  beforeEach(() => {
    mockRepository = createMockSearchRepository();
    service = createSearchService(mockRepository);
  });

  describe('タイトル・著者・ISBN・カテゴリによる部分一致検索', () => {
    it('タイトルで部分一致検索できる', async () => {
      const books = [
        createMockBook({ id: createBookId('book-1'), title: 'JavaScript入門' }),
        createMockBook({ id: createBookId('book-2'), title: 'JavaScriptパーフェクトガイド' }),
      ];
      mockRepository = createMockSearchRepository({
        search: vi.fn().mockResolvedValue({ books, total: 2 }),
      });
      service = createSearchService(mockRepository);

      const result: Result<SearchBooksResult, never> = await service.search({ keyword: 'JavaScript' });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.books).toHaveLength(2);
        expect(result.value.books[0]!.title).toContain('JavaScript');
      }
    });

    it('著者で部分一致検索できる', async () => {
      const books = [
        createMockBook({ id: createBookId('book-1'), author: '山田太郎' }),
      ];
      mockRepository = createMockSearchRepository({
        search: vi.fn().mockResolvedValue({ books, total: 1 }),
      });
      service = createSearchService(mockRepository);

      const result: Result<SearchBooksResult, never> = await service.search({ keyword: '山田' });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.books).toHaveLength(1);
        expect(result.value.books[0]!.author).toContain('山田');
      }
    });

    it('ISBNで検索できる', async () => {
      const books = [
        createMockBook({ id: createBookId('book-1'), isbn: '978-4-12-345678-4' }),
      ];
      mockRepository = createMockSearchRepository({
        search: vi.fn().mockResolvedValue({ books, total: 1 }),
      });
      service = createSearchService(mockRepository);

      const result: Result<SearchBooksResult, never> = await service.search({ keyword: '978-4-12-345678-4' });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.books).toHaveLength(1);
        expect(result.value.books[0]!.isbn).toBe('978-4-12-345678-4');
      }
    });

    it('カテゴリで検索できる', async () => {
      const books = [
        createMockBook({ id: createBookId('book-1'), category: 'プログラミング' }),
        createMockBook({ id: createBookId('book-2'), category: 'プログラミング' }),
      ];
      mockRepository = createMockSearchRepository({
        search: vi.fn().mockResolvedValue({ books, total: 2 }),
      });
      service = createSearchService(mockRepository);

      const result: Result<SearchBooksResult, never> = await service.search({ keyword: 'プログラミング' });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.books).toHaveLength(2);
      }
    });
  });

  describe('検索結果が0件の場合', () => {
    it('空の配列と適切なレスポンスを返す', async () => {
      mockRepository = createMockSearchRepository({
        search: vi.fn().mockResolvedValue({ books: [], total: 0 }),
      });
      service = createSearchService(mockRepository);

      const result: Result<SearchBooksResult, never> = await service.search({ keyword: '存在しない書籍' });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.books).toHaveLength(0);
        expect(result.value.total).toBe(0);
      }
    });
  });

  describe('検索結果のソート機能', () => {
    it('タイトル順（昇順）でソートできる', async () => {
      const books = [
        createMockBook({ id: createBookId('book-1'), title: 'A - 書籍' }),
        createMockBook({ id: createBookId('book-2'), title: 'B - 書籍' }),
      ];
      mockRepository = createMockSearchRepository({
        search: vi.fn().mockResolvedValue({ books, total: 2 }),
      });
      service = createSearchService(mockRepository);

      const result: Result<SearchBooksResult, never> = await service.search({
        keyword: '書籍',
        sortBy: 'title',
        sortOrder: 'asc',
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.books[0]!.title).toBe('A - 書籍');
        expect(result.value.books[1]!.title).toBe('B - 書籍');
      }
    });

    it('タイトル順（降順）でソートできる', async () => {
      const books = [
        createMockBook({ id: createBookId('book-2'), title: 'B - 書籍' }),
        createMockBook({ id: createBookId('book-1'), title: 'A - 書籍' }),
      ];
      mockRepository = createMockSearchRepository({
        search: vi.fn().mockResolvedValue({ books, total: 2 }),
      });
      service = createSearchService(mockRepository);

      const result: Result<SearchBooksResult, never> = await service.search({
        keyword: '書籍',
        sortBy: 'title',
        sortOrder: 'desc',
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.books[0]!.title).toBe('B - 書籍');
        expect(result.value.books[1]!.title).toBe('A - 書籍');
      }
    });

    it('著者順でソートできる', async () => {
      const books = [
        createMockBook({ id: createBookId('book-1'), author: 'A著者' }),
        createMockBook({ id: createBookId('book-2'), author: 'B著者' }),
      ];
      mockRepository = createMockSearchRepository({
        search: vi.fn().mockResolvedValue({ books, total: 2 }),
      });
      service = createSearchService(mockRepository);

      const result: Result<SearchBooksResult, never> = await service.search({
        keyword: '著者',
        sortBy: 'author',
        sortOrder: 'asc',
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.books[0]!.author).toBe('A著者');
      }
    });

    it('出版年順でソートできる', async () => {
      const books = [
        createMockBook({ id: createBookId('book-1'), publicationYear: 2020 }),
        createMockBook({ id: createBookId('book-2'), publicationYear: 2024 }),
      ];
      mockRepository = createMockSearchRepository({
        search: vi.fn().mockResolvedValue({ books, total: 2 }),
      });
      service = createSearchService(mockRepository);

      const result: Result<SearchBooksResult, never> = await service.search({
        keyword: '書籍',
        sortBy: 'publicationYear',
        sortOrder: 'asc',
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.books[0]!.publicationYear).toBe(2020);
        expect(result.value.books[1]!.publicationYear).toBe(2024);
      }
    });

    it('デフォルトではソート指定なし（リポジトリに委譲）', async () => {
      const books = [createMockBook()];
      mockRepository = createMockSearchRepository({
        search: vi.fn().mockResolvedValue({ books, total: 1 }),
      });
      service = createSearchService(mockRepository);

      const result: Result<SearchBooksResult, never> = await service.search({ keyword: '書籍' });

      expect(isOk(result)).toBe(true);
      expect(mockRepository.search).toHaveBeenCalledWith({
        keyword: '書籍',
      });
    });
  });

  describe('リポジトリへのパラメータ受け渡し', () => {
    it('検索パラメータが正しくリポジトリに渡される', async () => {
      const searchSpy = vi.fn().mockResolvedValue({ books: [], total: 0 });
      mockRepository = createMockSearchRepository({ search: searchSpy });
      service = createSearchService(mockRepository);

      await service.search({
        keyword: 'テスト',
        sortBy: 'title',
        sortOrder: 'desc',
      });

      expect(searchSpy).toHaveBeenCalledWith({
        keyword: 'テスト',
        sortBy: 'title',
        sortOrder: 'desc',
      });
    });
  });
});
