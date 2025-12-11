/**
 * PostgreSQL レポートリポジトリ
 *
 * PostgreSQLを使用したレポートデータの取得実装
 */

import type { ReportRepository } from '../../domains/report/report-repository.js';
import type {
  DateRange,
  PopularBookItem,
  CategoryStatisticsItem,
} from '../../domains/report/types.js';
import { createBookId } from '../../shared/branded-types.js';
import type { DatabasePool } from '../database/database.js';

// ============================================
// 行型定義
// ============================================

interface CountRow {
  count: string;
}

interface PopularBookRow {
  book_id: string;
  title: string;
  author: string;
  loan_count: string;
}

interface CategoryStatsRow {
  category: string;
  loan_count: string;
}

// ============================================
// リポジトリ実装
// ============================================

/**
 * PostgreSQLレポートリポジトリを作成
 */
export function createPgReportRepository(pool: DatabasePool): ReportRepository {
  return {
    async countLoans(dateRange: DateRange): Promise<number> {
      const result = await pool.query<CountRow>(
        `SELECT COUNT(*) as count FROM loans
         WHERE borrowed_at >= $1 AND borrowed_at <= $2`,
        [dateRange.startDate, dateRange.endDate]
      );
      return parseInt(result.rows[0]?.count ?? '0', 10);
    },

    async countReturns(dateRange: DateRange): Promise<number> {
      const result = await pool.query<CountRow>(
        `SELECT COUNT(*) as count FROM loans
         WHERE returned_at >= $1 AND returned_at <= $2`,
        [dateRange.startDate, dateRange.endDate]
      );
      return parseInt(result.rows[0]?.count ?? '0', 10);
    },

    async countOverdues(dateRange: DateRange): Promise<number> {
      const result = await pool.query<CountRow>(
        `SELECT COUNT(*) as count FROM overdue_records
         WHERE recorded_at >= $1 AND recorded_at <= $2`,
        [dateRange.startDate, dateRange.endDate]
      );
      return parseInt(result.rows[0]?.count ?? '0', 10);
    },

    async getPopularBooks(dateRange: DateRange, limit: number): Promise<PopularBookItem[]> {
      const result = await pool.query<PopularBookRow>(
        `SELECT b.id as book_id, b.title, b.author, COUNT(l.id) as loan_count
         FROM books b
         JOIN book_copies bc ON b.id = bc.book_id
         JOIN loans l ON bc.id = l.book_copy_id
         WHERE l.borrowed_at >= $1 AND l.borrowed_at <= $2
         GROUP BY b.id, b.title, b.author
         ORDER BY loan_count DESC
         LIMIT $3`,
        [dateRange.startDate, dateRange.endDate, limit]
      );
      return result.rows.map((row, index) => ({
        bookId: createBookId(row.book_id),
        title: row.title,
        author: row.author,
        loanCount: parseInt(row.loan_count, 10),
        rank: index + 1,
      }));
    },

    async getCategoryStatistics(dateRange: DateRange): Promise<CategoryStatisticsItem[]> {
      // 合計貸出数
      const totalResult = await pool.query<CountRow>(
        `SELECT COUNT(*) as count FROM loans
         WHERE borrowed_at >= $1 AND borrowed_at <= $2`,
        [dateRange.startDate, dateRange.endDate]
      );
      const totalLoans = parseInt(totalResult.rows[0]?.count ?? '0', 10);

      if (totalLoans === 0) {
        return [];
      }

      // カテゴリ別貸出数
      const result = await pool.query<CategoryStatsRow>(
        `SELECT COALESCE(b.category, 'その他') as category, COUNT(l.id) as loan_count
         FROM books b
         JOIN book_copies bc ON b.id = bc.book_id
         JOIN loans l ON bc.id = l.book_copy_id
         WHERE l.borrowed_at >= $1 AND l.borrowed_at <= $2
         GROUP BY b.category
         ORDER BY loan_count DESC`,
        [dateRange.startDate, dateRange.endDate]
      );

      return result.rows.map((row) => {
        const loanCount = parseInt(row.loan_count, 10);
        return {
          category: row.category,
          loanCount,
          percentage: Math.round((loanCount / totalLoans) * 1000) / 10,
        };
      });
    },
  };
}
