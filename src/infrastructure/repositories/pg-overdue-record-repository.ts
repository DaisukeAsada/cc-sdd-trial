/**
 * PostgreSQL 延滞記録リポジトリ
 *
 * PostgreSQLを使用した延滞記録データの永続化実装
 */

import type {
  OverdueRecordRepository,
  OverdueRecordRepositoryError,
} from '../../domains/loan/overdue-record-repository.js';
import type { OverdueRecord, CreateOverdueRecordInput } from '../../domains/loan/types.js';
import type { LoanId, UserId, OverdueRecordId } from '../../shared/branded-types.js';
import { createOverdueRecordId, createLoanId } from '../../shared/branded-types.js';
import { ok, err, type Result } from '../../shared/result.js';
import type { DatabasePool } from '../database/database.js';

// ============================================
// 行型定義
// ============================================

interface OverdueRecordRow {
  id: string;
  loan_id: string;
  overdue_days: number;
  recorded_at: Date;
}

// ============================================
// 変換関数
// ============================================

function rowToOverdueRecord(row: OverdueRecordRow): OverdueRecord {
  return {
    id: createOverdueRecordId(row.id),
    loanId: createLoanId(row.loan_id),
    overdueDays: row.overdue_days,
    recordedAt: row.recorded_at,
  };
}

// ============================================
// リポジトリ実装
// ============================================

/**
 * PostgreSQL延滞記録リポジトリを作成
 */
export function createPgOverdueRecordRepository(pool: DatabasePool): OverdueRecordRepository {
  return {
    async create(
      input: CreateOverdueRecordInput
    ): Promise<Result<OverdueRecord, OverdueRecordRepositoryError>> {
      const result = await pool.query<OverdueRecordRow>(
        `INSERT INTO overdue_records (loan_id, overdue_days)
         VALUES ($1, $2)
         RETURNING *`,
        [input.loanId, input.overdueDays]
      );
      const row = result.rows[0];
      if (!row) throw new Error('Failed to create overdue record');
      return ok(rowToOverdueRecord(row));
    },

    async findById(
      id: OverdueRecordId
    ): Promise<Result<OverdueRecord, OverdueRecordRepositoryError>> {
      const result = await pool.query<OverdueRecordRow>(
        'SELECT * FROM overdue_records WHERE id = $1',
        [id]
      );
      const row = result.rows[0];
      if (!row) {
        return err({ type: 'NOT_FOUND', id });
      }
      return ok(rowToOverdueRecord(row));
    },

    async findByLoanId(loanId: LoanId): Promise<OverdueRecord | null> {
      const result = await pool.query<OverdueRecordRow>(
        'SELECT * FROM overdue_records WHERE loan_id = $1',
        [loanId]
      );
      const row = result.rows[0];
      return row ? rowToOverdueRecord(row) : null;
    },

    async findByUserId(userId: UserId): Promise<OverdueRecord[]> {
      const result = await pool.query<OverdueRecordRow>(
        `SELECT o.* FROM overdue_records o
         JOIN loans l ON o.loan_id = l.id
         WHERE l.user_id = $1
         ORDER BY o.recorded_at DESC`,
        [userId]
      );
      return result.rows.map(rowToOverdueRecord);
    },
  };
}
