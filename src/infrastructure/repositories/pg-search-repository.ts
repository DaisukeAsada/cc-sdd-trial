/**
 * PostgreSQL 検索リポジトリ
 *
 * PostgreSQLを使用した蔵書検索の実装
 */

import type {
  SearchRepository,
  SearchBooksInput,
  SearchBooksResult,
} from '../../domains/book/search-repository.js';
import type { Book } from '../../domains/book/types.js';
import { createBookId } from '../../shared/branded-types.js';
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

interface CountRow {
  count: string;
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

// ============================================
// リポジトリ実装
// ============================================

/**
 * PostgreSQL検索リポジトリを作成
 */
export function createPgSearchRepository(pool: DatabasePool): SearchRepository {
  return {
    async search(input: SearchBooksInput): Promise<SearchBooksResult> {
      const conditions: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      // キーワード検索
      if (input.keyword.trim() !== '') {
        const keyword = `%${input.keyword}%`;
        conditions.push(`(
          title ILIKE $${String(paramIndex)} OR
          author ILIKE $${String(paramIndex)} OR
          isbn ILIKE $${String(paramIndex)} OR
          category ILIKE $${String(paramIndex)}
        )`);
        params.push(keyword);
        paramIndex++;
      }

      // カテゴリフィルタ
      if (input.category !== undefined && input.category !== '') {
        conditions.push(`category = $${String(paramIndex)}`);
        params.push(input.category);
        paramIndex++;
      }

      // 出版年フィルタ
      if (input.publicationYearFrom !== undefined) {
        conditions.push(`publication_year >= $${String(paramIndex)}`);
        params.push(input.publicationYearFrom);
        paramIndex++;
      }
      if (input.publicationYearTo !== undefined) {
        conditions.push(`publication_year <= $${String(paramIndex)}`);
        params.push(input.publicationYearTo);
        paramIndex++;
      }

      // 貸出可能のみ
      if (input.availableOnly === true) {
        conditions.push(`EXISTS (
          SELECT 1 FROM book_copies bc
          WHERE bc.book_id = books.id AND bc.status = 'AVAILABLE'
        )`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // ソート
      const sortBy = input.sortBy ?? 'title';
      const sortOrder = input.sortOrder ?? 'asc';
      const sortColumn = sortBy === 'publicationYear' ? 'publication_year' : sortBy;
      const orderClause = `ORDER BY ${sortColumn} ${sortOrder.toUpperCase()} NULLS LAST`;

      // カウント
      const countResult = await pool.query<CountRow>(
        `SELECT COUNT(*) as count FROM books ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

      // データ取得
      const dataResult = await pool.query<BookRow>(
        `SELECT * FROM books ${whereClause} ${orderClause}`,
        params
      );

      return {
        books: dataResult.rows.map(rowToBook),
        total,
      };
    },
  };
}
