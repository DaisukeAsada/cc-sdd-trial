/**
 * PostgreSQL 予約リポジトリ
 *
 * PostgreSQLを使用した予約データの永続化実装
 */

import type { ReservationRepository } from '../../domains/reservation/reservation-repository.js';
import type {
  Reservation,
  CreateReservationInput,
  ReservationError,
  ReservationStatus,
} from '../../domains/reservation/types.js';
import type { ReservationId, UserId, BookId } from '../../shared/branded-types.js';
import { createReservationId, createUserId, createBookId } from '../../shared/branded-types.js';
import { ok, err, type Result } from '../../shared/result.js';
import type { DatabasePool } from '../database/database.js';

// ============================================
// 行型定義
// ============================================

interface ReservationRow {
  id: string;
  user_id: string;
  book_id: string;
  reserved_at: Date;
  notified_at: Date | null;
  expires_at: Date | null;
  status: ReservationStatus;
  queue_position: number;
}

interface CountRow {
  count: string;
}

// ============================================
// 変換関数
// ============================================

function rowToReservation(row: ReservationRow): Reservation {
  return {
    id: createReservationId(row.id),
    userId: createUserId(row.user_id),
    bookId: createBookId(row.book_id),
    reservedAt: row.reserved_at,
    notifiedAt: row.notified_at,
    expiresAt: row.expires_at,
    status: row.status,
    queuePosition: row.queue_position,
  };
}

// ============================================
// リポジトリ実装
// ============================================

/**
 * PostgreSQL予約リポジトリを作成
 */
export function createPgReservationRepository(pool: DatabasePool): ReservationRepository {
  return {
    async create(
      input: CreateReservationInput,
      queuePosition: number
    ): Promise<Result<Reservation, ReservationError>> {
      const result = await pool.query<ReservationRow>(
        `INSERT INTO reservations (user_id, book_id, queue_position)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [input.userId, input.bookId, queuePosition]
      );
      const row = result.rows[0];
      if (!row) throw new Error('Failed to create reservation');
      return ok(rowToReservation(row));
    },

    async findById(id: ReservationId): Promise<Result<Reservation, ReservationError>> {
      const result = await pool.query<ReservationRow>('SELECT * FROM reservations WHERE id = $1', [
        id,
      ]);
      const row = result.rows[0];
      if (!row) {
        return err({ type: 'RESERVATION_NOT_FOUND', reservationId: id });
      }
      return ok(rowToReservation(row));
    },

    async findActiveByBookId(bookId: BookId): Promise<Reservation[]> {
      const result = await pool.query<ReservationRow>(
        `SELECT * FROM reservations
         WHERE book_id = $1 AND status IN ('PENDING', 'NOTIFIED')
         ORDER BY queue_position`,
        [bookId]
      );
      return result.rows.map(rowToReservation);
    },

    async countActiveByBookId(bookId: BookId): Promise<number> {
      const result = await pool.query<CountRow>(
        `SELECT COUNT(*) as count FROM reservations
         WHERE book_id = $1 AND status IN ('PENDING', 'NOTIFIED')`,
        [bookId]
      );
      return parseInt(result.rows[0]?.count ?? '0', 10);
    },

    async hasActiveReservation(userId: UserId, bookId: BookId): Promise<boolean> {
      const result = await pool.query<CountRow>(
        `SELECT COUNT(*) as count FROM reservations
         WHERE user_id = $1 AND book_id = $2 AND status IN ('PENDING', 'NOTIFIED')`,
        [userId, bookId]
      );
      return parseInt(result.rows[0]?.count ?? '0', 10) > 0;
    },

    async updateStatus(
      id: ReservationId,
      status: ReservationStatus,
      notifiedAt?: Date,
      expiresAt?: Date
    ): Promise<Result<Reservation, ReservationError>> {
      const result = await pool.query<ReservationRow>(
        `UPDATE reservations SET
           status = $1,
           notified_at = COALESCE($2, notified_at),
           expires_at = COALESCE($3, expires_at)
         WHERE id = $4
         RETURNING *`,
        [status, notifiedAt ?? null, expiresAt ?? null, id]
      );
      const row = result.rows[0];
      if (!row) {
        return err({ type: 'RESERVATION_NOT_FOUND', reservationId: id });
      }
      return ok(rowToReservation(row));
    },

    async findByUserId(userId: UserId): Promise<Reservation[]> {
      const result = await pool.query<ReservationRow>(
        'SELECT * FROM reservations WHERE user_id = $1 ORDER BY reserved_at DESC',
        [userId]
      );
      return result.rows.map(rowToReservation);
    },

    async findExpiredReservations(): Promise<Reservation[]> {
      const result = await pool.query<ReservationRow>(
        `SELECT * FROM reservations
         WHERE status = 'NOTIFIED' AND expires_at < NOW()`,
        []
      );
      return result.rows.map(rowToReservation);
    },
  };
}
