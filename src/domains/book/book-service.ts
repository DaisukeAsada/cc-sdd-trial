/**
 * BookService - 蔵書管理サービス
 *
 * 蔵書（書籍マスタ）のCRUD操作を提供します。
 */

import type { BookId } from '../../shared/branded-types.js';
import type { Result } from '../../shared/result.js';
import { ok, err, isErr } from '../../shared/result.js';
import { validateISBN, validateRequired } from '../../shared/validation.js';
import type { BookRepository } from './book-repository.js';
import type { Book, CreateBookInput, UpdateBookInput, BookError } from './types.js';

// ============================================
// サービスインターフェース
// ============================================

/** BookService インターフェース */
export interface BookService {
  /**
   * 新しい書籍を登録
   * @param input - 書籍登録入力
   * @returns 作成された書籍またはエラー
   */
  createBook(input: CreateBookInput): Promise<Result<Book, BookError>>;

  /**
   * IDで書籍を取得
   * @param id - 書籍ID
   * @returns 書籍またはNOT_FOUNDエラー
   */
  getBookById(id: BookId): Promise<Result<Book, BookError>>;

  /**
   * 書籍情報を更新
   * @param id - 書籍ID
   * @param input - 更新入力
   * @returns 更新された書籍またはエラー
   */
  updateBook(id: BookId, input: UpdateBookInput): Promise<Result<Book, BookError>>;

  /**
   * 書籍を削除
   * @param id - 書籍ID
   * @returns 成功またはNOT_FOUNDエラー
   */
  deleteBook(id: BookId): Promise<Result<void, BookError>>;
}

// ============================================
// バリデーション関数
// ============================================

/**
 * 書籍登録入力をバリデーション
 */
function validateCreateBookInput(
  input: CreateBookInput
): Result<CreateBookInput, BookError> {
  // タイトル必須チェック
  const titleResult = validateRequired(input.title, 'title');
  if (isErr(titleResult)) {
    return err({
      type: 'VALIDATION_ERROR',
      field: 'title',
      message: titleResult.error.message,
    });
  }

  // 著者必須チェック
  const authorResult = validateRequired(input.author, 'author');
  if (isErr(authorResult)) {
    return err({
      type: 'VALIDATION_ERROR',
      field: 'author',
      message: authorResult.error.message,
    });
  }

  // ISBN必須チェック
  const isbnRequiredResult = validateRequired(input.isbn, 'isbn');
  if (isErr(isbnRequiredResult)) {
    return err({
      type: 'VALIDATION_ERROR',
      field: 'isbn',
      message: isbnRequiredResult.error.message,
    });
  }

  // ISBN形式チェック
  const isbnResult = validateISBN(input.isbn);
  if (isErr(isbnResult)) {
    return err({
      type: 'VALIDATION_ERROR',
      field: 'isbn',
      message: isbnResult.error.message,
    });
  }

  return ok(input);
}

/**
 * 書籍更新入力をバリデーション
 */
function validateUpdateBookInput(
  input: UpdateBookInput
): Result<UpdateBookInput, BookError> {
  // タイトルが指定されていて空の場合はエラー
  if (input.title !== undefined && input.title.trim() === '') {
    return err({
      type: 'VALIDATION_ERROR',
      field: 'title',
      message: 'title cannot be empty',
    });
  }

  // 著者が指定されていて空の場合はエラー
  if (input.author !== undefined && input.author.trim() === '') {
    return err({
      type: 'VALIDATION_ERROR',
      field: 'author',
      message: 'author cannot be empty',
    });
  }

  // ISBNが指定されていて空の場合はエラー
  if (input.isbn !== undefined && input.isbn.trim() === '') {
    return err({
      type: 'VALIDATION_ERROR',
      field: 'isbn',
      message: 'isbn cannot be empty',
    });
  }

  // ISBNが指定されている場合は形式チェック
  if (input.isbn !== undefined && input.isbn.trim() !== '') {
    const isbnResult = validateISBN(input.isbn);
    if (isErr(isbnResult)) {
      return err({
        type: 'VALIDATION_ERROR',
        field: 'isbn',
        message: isbnResult.error.message,
      });
    }
  }

  return ok(input);
}

// ============================================
// サービス実装
// ============================================

/**
 * BookServiceを作成
 * @param repository - 書籍リポジトリ
 * @returns BookService
 */
export function createBookService(repository: BookRepository): BookService {
  return {
    async createBook(input: CreateBookInput): Promise<Result<Book, BookError>> {
      // 入力バリデーション
      const validationResult = validateCreateBookInput(input);
      if (isErr(validationResult)) {
        return validationResult;
      }

      // ISBN重複チェック
      const existingBook = await repository.findByIsbn(input.isbn);
      if (existingBook !== null) {
        return err({
          type: 'DUPLICATE_ISBN',
          isbn: input.isbn,
        });
      }

      // 書籍作成
      return repository.create(input);
    },

    async getBookById(id: BookId): Promise<Result<Book, BookError>> {
      return repository.findById(id);
    },

    async updateBook(
      id: BookId,
      input: UpdateBookInput
    ): Promise<Result<Book, BookError>> {
      // 書籍存在チェック
      const existingResult = await repository.findById(id);
      if (isErr(existingResult)) {
        return existingResult;
      }

      // 入力バリデーション
      const validationResult = validateUpdateBookInput(input);
      if (isErr(validationResult)) {
        return validationResult;
      }

      // ISBN更新時の重複チェック
      if (input.isbn !== undefined && input.isbn !== existingResult.value.isbn) {
        const duplicateBook = await repository.findByIsbn(input.isbn);
        if (duplicateBook !== null && duplicateBook.id !== id) {
          return err({
            type: 'DUPLICATE_ISBN',
            isbn: input.isbn,
          });
        }
      }

      // 書籍更新
      return repository.update(id, input);
    },

    async deleteBook(id: BookId): Promise<Result<void, BookError>> {
      // 書籍存在チェック
      const existingResult = await repository.findById(id);
      if (isErr(existingResult)) {
        return existingResult;
      }

      // 書籍削除
      return repository.delete(id);
    },
  };
}
