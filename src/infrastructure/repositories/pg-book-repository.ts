/**
 * PostgreSQL 書籍リポジトリ
 *
 * PostgreSQLを使用した書籍データの永続化実装
 */

import type { BookRepository } from '../../domains/book/book-repository.js';
import type {
  Book,
  BookCopy,
  BookCopyStatus,
  CreateBookInput,
  UpdateBookInput,
  CreateCopyInput,
  BookError,
} from '../../domains/book/types.js';
import type { BookId, CopyId } from '../../shared/branded-types.js';
import { createBookId, createCopyId } from '../../shared/branded-types.js';
import { ok, err, type Result } from '../../shared/result.js';
import type { DatabasePool } from '../database/database.js';

// ============================================
// 行型定義
// ============================================

interface BookRow {
  id: string;
  title: string;
  author: string;
  publisher: string | null;
  publication_year: number | null;
  isbn: string;
  category: string | null;
  created_at: Date;
  updated_at: Date;
}

interface BookCopyRow {
  id: string;
  book_id: string;
  location: string;
  status: BookCopyStatus;
  created_at: Date;
}

// ============================================
// 変換関数
// ============================================

function rowToBook(row: BookRow): Book {
  return {
    id: createBookId(row.id),
    title: row.title,
    author: row.author,
    publisher: row.publisher,
    publicationYear: row.publication_year,
    isbn: row.isbn,
    category: row.category,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToBookCopy(row: BookCopyRow): BookCopy {
  return {
    id: createCopyId(row.id),
    bookId: createBookId(row.book_id),
    location: row.location,
    status: row.status,
    createdAt: row.created_at,
  };
}

// ============================================
// リポジトリ実装
// ============================================

/**
 * PostgreSQL書籍リポジトリを作成
 */
export function createPgBookRepository(pool: DatabasePool): BookRepository {
  return {
    async create(input: CreateBookInput): Promise<Result<Book, BookError>> {
      try {
        const result = await pool.query<BookRow>(
          `INSERT INTO books (title, author, publisher, publication_year, isbn, category)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            input.title,
            input.author,
            input.publisher ?? null,
            input.publicationYear ?? null,
            input.isbn,
            input.category ?? null,
          ]
        );
        const row = result.rows[0];
        if (!row) throw new Error('Failed to create book');
        return ok(rowToBook(row));
      } catch (error) {
        if ((error as { code?: string }).code === '23505') {
          return err({ type: 'DUPLICATE_ISBN', isbn: input.isbn });
        }
        throw error;
      }
    },

    async findById(id: BookId): Promise<Result<Book, BookError>> {
      const result = await pool.query<BookRow>('SELECT * FROM books WHERE id = $1', [id]);
      const row = result.rows[0];
      if (!row) {
        return err({ type: 'NOT_FOUND', id });
      }
      return ok(rowToBook(row));
    },

    async findByIsbn(isbn: string): Promise<Book | null> {
      const result = await pool.query<BookRow>('SELECT * FROM books WHERE isbn = $1', [isbn]);
      const row = result.rows[0];
      return row ? rowToBook(row) : null;
    },

    async update(id: BookId, input: UpdateBookInput): Promise<Result<Book, BookError>> {
      const existing = await pool.query<BookRow>('SELECT * FROM books WHERE id = $1', [id]);
      const current = existing.rows[0];
      if (!current) {
        return err({ type: 'NOT_FOUND', id });
      }

      try {
        const result = await pool.query<BookRow>(
          `UPDATE books SET
             title = $1,
             author = $2,
             publisher = $3,
             publication_year = $4,
             isbn = $5,
             category = $6,
             updated_at = NOW()
           WHERE id = $7
           RETURNING *`,
          [
            input.title ?? current.title,
            input.author ?? current.author,
            input.publisher !== undefined ? input.publisher : current.publisher,
            input.publicationYear !== undefined ? input.publicationYear : current.publication_year,
            input.isbn ?? current.isbn,
            input.category !== undefined ? input.category : current.category,
            id,
          ]
        );
        const row = result.rows[0];
        if (!row) throw new Error('Failed to update book');
        return ok(rowToBook(row));
      } catch (error) {
        if ((error as { code?: string }).code === '23505') {
          return err({ type: 'DUPLICATE_ISBN', isbn: input.isbn ?? '' });
        }
        throw error;
      }
    },

    async delete(id: BookId): Promise<Result<void, BookError>> {
      const result = await pool.query('DELETE FROM books WHERE id = $1', [id]);
      if (result.rowCount === 0) {
        return err({ type: 'NOT_FOUND', id });
      }
      return ok(undefined);
    },

    async createCopy(bookId: BookId, input: CreateCopyInput): Promise<Result<BookCopy, BookError>> {
      const bookExists = await pool.query('SELECT 1 FROM books WHERE id = $1', [bookId]);
      if (bookExists.rows.length === 0) {
        return err({ type: 'NOT_FOUND', id: bookId });
      }

      const result = await pool.query<BookCopyRow>(
        `INSERT INTO book_copies (book_id, location, status)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [bookId, input.location, input.status ?? 'AVAILABLE']
      );
      const row = result.rows[0];
      if (!row) throw new Error('Failed to create book copy');
      return ok(rowToBookCopy(row));
    },

    async findCopyById(copyId: CopyId): Promise<Result<BookCopy, BookError>> {
      const result = await pool.query<BookCopyRow>('SELECT * FROM book_copies WHERE id = $1', [
        copyId,
      ]);
      const row = result.rows[0];
      if (!row) {
        return err({ type: 'NOT_FOUND', id: copyId });
      }
      return ok(rowToBookCopy(row));
    },

    async updateCopy(copyId: CopyId, status: BookCopyStatus): Promise<Result<BookCopy, BookError>> {
      const result = await pool.query<BookCopyRow>(
        `UPDATE book_copies SET status = $1 WHERE id = $2 RETURNING *`,
        [status, copyId]
      );
      const row = result.rows[0];
      if (!row) {
        return err({ type: 'NOT_FOUND', id: copyId });
      }
      return ok(rowToBookCopy(row));
    },

    async findCopiesByBookId(bookId: BookId): Promise<Result<BookCopy[], BookError>> {
      const result = await pool.query<BookCopyRow>(
        'SELECT * FROM book_copies WHERE book_id = $1 ORDER BY created_at',
        [bookId]
      );
      return ok(result.rows.map(rowToBookCopy));
    },
  };
}
