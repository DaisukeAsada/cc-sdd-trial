/**
 * PostgreSQL 貸出リポジトリ
 *
 * PostgreSQLを使用した貸出データの永続化実装
 */

import type { LoanRepository } from '../../domains/loan/loan-repository.js';
import type { Loan, CreateLoanInput, LoanError } from '../../domains/loan/types.js';
import type { LoanId, UserId, CopyId } from '../../shared/branded-types.js';
import { createLoanId, createUserId, createCopyId } from '../../shared/branded-types.js';
import { ok, err, type Result } from '../../shared/result.js';
import type { DatabasePool } from '../database/database.js';

// ============================================
// 行型定義
// ============================================

interface LoanRow {
  id: string;
  user_id: string;
  book_copy_id: string;
  borrowed_at: Date;
  due_date: Date;
  returned_at: Date | null;
}

interface CountRow {
  count: string;
}

// ============================================
// 変換関数
// ============================================

function rowToLoan(row: LoanRow): Loan {
  return {
    id: createLoanId(row.id),
    userId: createUserId(row.user_id),
    bookCopyId: createCopyId(row.book_copy_id),
    borrowedAt: row.borrowed_at,
    dueDate: row.due_date,
    returnedAt: row.returned_at,
  };
}

// ============================================
// リポジトリ実装
// ============================================

/**
 * PostgreSQL貸出リポジトリを作成
 */
export function createPgLoanRepository(pool: DatabasePool): LoanRepository {
  return {
    async create(input: CreateLoanInput, dueDate: Date): Promise<Result<Loan, LoanError>> {
      const result = await pool.query<LoanRow>(
        `INSERT INTO loans (user_id, book_copy_id, due_date)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [input.userId, input.bookCopyId, dueDate]
      );
      const row = result.rows[0];
      if (!row) throw new Error('Failed to create loan');
      return ok(rowToLoan(row));
    },

    async findById(id: LoanId): Promise<Result<Loan, LoanError>> {
      const result = await pool.query<LoanRow>('SELECT * FROM loans WHERE id = $1', [id]);
      const row = result.rows[0];
      if (!row) {
        return err({ type: 'LOAN_NOT_FOUND', loanId: id });
      }
      return ok(rowToLoan(row));
    },

    async countActiveLoans(userId: UserId): Promise<number> {
      const result = await pool.query<CountRow>(
        'SELECT COUNT(*) as count FROM loans WHERE user_id = $1 AND returned_at IS NULL',
        [userId]
      );
      return parseInt(result.rows[0]?.count ?? '0', 10);
    },

    async findActiveByUserId(userId: UserId): Promise<Loan[]> {
      const result = await pool.query<LoanRow>(
        'SELECT * FROM loans WHERE user_id = $1 AND returned_at IS NULL ORDER BY borrowed_at',
        [userId]
      );
      return result.rows.map(rowToLoan);
    },

    async findActiveByCopyId(copyId: CopyId): Promise<Loan | null> {
      const result = await pool.query<LoanRow>(
        'SELECT * FROM loans WHERE book_copy_id = $1 AND returned_at IS NULL',
        [copyId]
      );
      const row = result.rows[0];
      return row ? rowToLoan(row) : null;
    },

    async findActiveByMultipleCopyIds(copyIds: readonly CopyId[]): Promise<Loan[]> {
      if (copyIds.length === 0) {
        return [];
      }
      const placeholders = copyIds.map((_, i) => `$${String(i + 1)}`).join(', ');
      const result = await pool.query<LoanRow>(
        `SELECT * FROM loans WHERE book_copy_id IN (${placeholders}) AND returned_at IS NULL`,
        [...copyIds]
      );
      return result.rows.map(rowToLoan);
    },

    async updateReturnedAt(id: LoanId, returnedAt: Date): Promise<Result<Loan, LoanError>> {
      const result = await pool.query<LoanRow>(
        `UPDATE loans SET returned_at = $1 WHERE id = $2 RETURNING *`,
        [returnedAt, id]
      );
      const row = result.rows[0];
      if (!row) {
        return err({ type: 'LOAN_NOT_FOUND', loanId: id });
      }
      return ok(rowToLoan(row));
    },
  };
}
