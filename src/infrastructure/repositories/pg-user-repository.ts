/**
 * PostgreSQL 利用者リポジトリ
 *
 * PostgreSQLを使用した利用者データの永続化実装
 */

import type { UserRepository } from '../../domains/user/user-repository.js';
import type {
  User,
  CreateUserInput,
  UpdateUserInput,
  UserError,
  UserSearchCriteria,
  LoanSummary,
} from '../../domains/user/types.js';
import { DEFAULT_LOAN_LIMIT } from '../../domains/user/types.js';
import type { UserId } from '../../shared/branded-types.js';
import { createUserId } from '../../shared/branded-types.js';
import { ok, err, type Result } from '../../shared/result.js';
import type { DatabasePool } from '../database/database.js';

// ============================================
// 行型定義
// ============================================

interface UserRow {
  id: string;
  name: string;
  address: string | null;
  email: string;
  phone: string | null;
  registered_at: Date;
  loan_limit: number;
}

interface LoanSummaryRow {
  id: string;
  book_copy_id: string;
  book_title: string;
  borrowed_at: Date;
  due_date: Date;
  returned_at: Date | null;
}

// ============================================
// 変換関数
// ============================================

function rowToUser(row: UserRow): User {
  return {
    id: createUserId(row.id),
    name: row.name,
    address: row.address,
    email: row.email,
    phone: row.phone,
    registeredAt: row.registered_at,
    loanLimit: row.loan_limit,
  };
}

function rowToLoanSummary(row: LoanSummaryRow): LoanSummary {
  const now = new Date();
  const dueDate = new Date(row.due_date);
  const isOverdue = row.returned_at === null && dueDate < now;

  return {
    id: row.id,
    bookCopyId: row.book_copy_id,
    bookTitle: row.book_title,
    borrowedAt: row.borrowed_at,
    dueDate: row.due_date,
    returnedAt: row.returned_at,
    isOverdue,
  };
}

// ============================================
// リポジトリ実装
// ============================================

/**
 * PostgreSQL利用者リポジトリを作成
 */
export function createPgUserRepository(pool: DatabasePool): UserRepository {
  return {
    async create(input: CreateUserInput): Promise<Result<User, UserError>> {
      try {
        const result = await pool.query<UserRow>(
          `INSERT INTO users (name, address, email, phone, loan_limit)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [
            input.name,
            input.address ?? null,
            input.email,
            input.phone ?? null,
            input.loanLimit ?? DEFAULT_LOAN_LIMIT,
          ]
        );
        const row = result.rows[0];
        if (!row) throw new Error('Failed to create user');
        return ok(rowToUser(row));
      } catch (error) {
        if ((error as { code?: string }).code === '23505') {
          return err({ type: 'DUPLICATE_EMAIL', email: input.email });
        }
        throw error;
      }
    },

    async findById(id: UserId): Promise<Result<User, UserError>> {
      const result = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
      const row = result.rows[0];
      if (!row) {
        return err({ type: 'NOT_FOUND', id });
      }
      return ok(rowToUser(row));
    },

    async findByEmail(email: string): Promise<User | null> {
      const result = await pool.query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
      const row = result.rows[0];
      return row ? rowToUser(row) : null;
    },

    async search(criteria: UserSearchCriteria): Promise<User[]> {
      const conditions: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (criteria.name !== undefined && criteria.name !== '') {
        conditions.push(`name ILIKE $${String(paramIndex)}`);
        params.push(`%${criteria.name}%`);
        paramIndex++;
      }
      if (criteria.userId !== undefined && criteria.userId !== '') {
        conditions.push(`id::text ILIKE $${String(paramIndex)}`);
        params.push(`%${criteria.userId}%`);
        paramIndex++;
      }
      if (criteria.email !== undefined && criteria.email !== '') {
        conditions.push(`email ILIKE $${String(paramIndex)}`);
        params.push(`%${criteria.email}%`);
        paramIndex++;
      }
      if (criteria.phone !== undefined && criteria.phone !== '') {
        conditions.push(`phone ILIKE $${String(paramIndex)}`);
        params.push(`%${criteria.phone}%`);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await pool.query<UserRow>(
        `SELECT * FROM users ${whereClause} ORDER BY name`,
        params
      );
      return result.rows.map(rowToUser);
    },

    async findUserLoans(userId: UserId): Promise<LoanSummary[]> {
      const result = await pool.query<LoanSummaryRow>(
        `SELECT l.id, l.book_copy_id, b.title as book_title, l.borrowed_at, l.due_date, l.returned_at
         FROM loans l
         JOIN book_copies bc ON l.book_copy_id = bc.id
         JOIN books b ON bc.book_id = b.id
         WHERE l.user_id = $1
         ORDER BY l.borrowed_at DESC`,
        [userId]
      );
      return result.rows.map(rowToLoanSummary);
    },

    async update(id: UserId, input: UpdateUserInput): Promise<Result<User, UserError>> {
      const existing = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
      const current = existing.rows[0];
      if (!current) {
        return err({ type: 'NOT_FOUND', id });
      }

      try {
        const result = await pool.query<UserRow>(
          `UPDATE users SET
             name = $1,
             address = $2,
             email = $3,
             phone = $4,
             loan_limit = $5
           WHERE id = $6
           RETURNING *`,
          [
            input.name ?? current.name,
            input.address !== undefined ? input.address : current.address,
            input.email ?? current.email,
            input.phone !== undefined ? input.phone : current.phone,
            input.loanLimit ?? current.loan_limit,
            id,
          ]
        );
        const row = result.rows[0];
        if (!row) throw new Error('Failed to update user');
        return ok(rowToUser(row));
      } catch (error) {
        if ((error as { code?: string }).code === '23505') {
          return err({ type: 'DUPLICATE_EMAIL', email: input.email ?? '' });
        }
        throw error;
      }
    },

    async delete(id: UserId): Promise<Result<void, UserError>> {
      const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
      if (result.rowCount === 0) {
        return err({ type: 'NOT_FOUND', id });
      }
      return ok(undefined);
    },
  };
}
