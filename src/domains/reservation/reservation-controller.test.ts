/**
 * ReservationController テスト
 *
 * TDDに従い、予約管理REST APIのテストを先に記述します。
 *
 * エンドポイント:
 * - POST /api/reservations - 予約作成
 * - DELETE /api/reservations/:id - 予約キャンセル
 * - GET /api/users/:id/reservations - 利用者の予約一覧
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { createReservationController } from './reservation-controller.js';
import type { ReservationService } from './reservation-service.js';
import type { ReservationRepository } from './reservation-repository.js';
import { createReservationId, createUserId, createBookId } from '../../shared/branded-types.js';
import { ok, err } from '../../shared/result.js';
import type { Reservation, ReservationError } from './types.js';

// ============================================
// モックファクトリ
// ============================================

function createMockReservationService(): ReservationService {
  return {
    createReservation: vi.fn(),
    cancelReservation: vi.fn(),
    processReturnedBook: vi.fn(),
    expireOverdueReservations: vi.fn(),
  };
}

function createMockReservationRepository(): Pick<ReservationRepository, 'findByUserId'> {
  return {
    findByUserId: vi.fn(),
  };
}

// ============================================
// テストデータ
// ============================================

const testUserId = createUserId('user-123');
const testBookId = createBookId('book-456');
const testReservationId = createReservationId('reservation-789');

const testReservation: Reservation = {
  id: testReservationId,
  userId: testUserId,
  bookId: testBookId,
  reservedAt: new Date('2024-06-01T10:00:00Z'),
  notifiedAt: null,
  expiresAt: null,
  status: 'PENDING',
  queuePosition: 1,
};

// ============================================
// テストセットアップ
// ============================================

function createTestApp(
  reservationService: ReservationService,
  reservationRepository: Pick<ReservationRepository, 'findByUserId'>
): Express {
  const app = express();
  app.use(express.json());
  app.use('/api', createReservationController(reservationService, reservationRepository));
  return app;
}

// ============================================
// テスト
// ============================================

describe('ReservationController', () => {
  let mockReservationService: ReturnType<typeof createMockReservationService>;
  let mockReservationRepository: ReturnType<typeof createMockReservationRepository>;
  let app: Express;

  beforeEach(() => {
    mockReservationService = createMockReservationService();
    mockReservationRepository = createMockReservationRepository();
    app = createTestApp(mockReservationService, mockReservationRepository);
  });

  // ============================================
  // POST /api/reservations - 予約作成
  // ============================================

  describe('POST /api/reservations - 予約作成', () => {
    describe('正常系', () => {
      it('有効なリクエストで予約を作成し201を返す', async () => {
        // Arrange
        vi.mocked(mockReservationService.createReservation).mockResolvedValue(ok(testReservation));

        // Act
        const response = await request(app).post('/api/reservations').send({
          userId: testUserId,
          bookId: testBookId,
        });

        // Assert
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id', testReservationId);
        expect(response.body).toHaveProperty('userId', testUserId);
        expect(response.body).toHaveProperty('bookId', testBookId);
        expect(response.body).toHaveProperty('status', 'PENDING');
        expect(response.body).toHaveProperty('queuePosition', 1);
      });

      it('サービスが正しいパラメータで呼び出される', async () => {
        // Arrange
        vi.mocked(mockReservationService.createReservation).mockResolvedValue(ok(testReservation));

        // Act
        await request(app).post('/api/reservations').send({
          userId: testUserId,
          bookId: testBookId,
        });

        // Assert
        expect(mockReservationService.createReservation).toHaveBeenCalledWith({
          userId: testUserId,
          bookId: testBookId,
        });
      });
    });

    describe('異常系 - バリデーションエラー', () => {
      it('userIdが未指定の場合400を返す', async () => {
        // Act
        const response = await request(app).post('/api/reservations').send({
          bookId: testBookId,
        });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.error).toHaveProperty('type', 'VALIDATION_ERROR');
        expect(response.body.error).toHaveProperty('field', 'userId');
      });

      it('bookIdが未指定の場合400を返す', async () => {
        // Act
        const response = await request(app).post('/api/reservations').send({
          userId: testUserId,
        });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.error).toHaveProperty('type', 'VALIDATION_ERROR');
        expect(response.body.error).toHaveProperty('field', 'bookId');
      });
    });

    describe('異常系 - ビジネスルールエラー', () => {
      it('存在しない利用者の場合404を返す', async () => {
        // Arrange
        const error: ReservationError = {
          type: 'USER_NOT_FOUND',
          userId: testUserId,
        };
        vi.mocked(mockReservationService.createReservation).mockResolvedValue(err(error));

        // Act
        const response = await request(app).post('/api/reservations').send({
          userId: testUserId,
          bookId: testBookId,
        });

        // Assert
        expect(response.status).toBe(404);
        expect(response.body.error).toHaveProperty('type', 'USER_NOT_FOUND');
      });

      it('存在しない書籍の場合404を返す', async () => {
        // Arrange
        const error: ReservationError = {
          type: 'BOOK_NOT_FOUND',
          bookId: testBookId,
        };
        vi.mocked(mockReservationService.createReservation).mockResolvedValue(err(error));

        // Act
        const response = await request(app).post('/api/reservations').send({
          userId: testUserId,
          bookId: testBookId,
        });

        // Assert
        expect(response.status).toBe(404);
        expect(response.body.error).toHaveProperty('type', 'BOOK_NOT_FOUND');
      });

      it('書籍が貸出可能な場合409を返す', async () => {
        // Arrange
        const error: ReservationError = {
          type: 'BOOK_AVAILABLE',
          bookId: testBookId,
        };
        vi.mocked(mockReservationService.createReservation).mockResolvedValue(err(error));

        // Act
        const response = await request(app).post('/api/reservations').send({
          userId: testUserId,
          bookId: testBookId,
        });

        // Assert
        expect(response.status).toBe(409);
        expect(response.body.error).toHaveProperty('type', 'BOOK_AVAILABLE');
      });

      it('既に同じ書籍を予約している場合409を返す', async () => {
        // Arrange
        const error: ReservationError = {
          type: 'ALREADY_RESERVED',
          userId: testUserId,
          bookId: testBookId,
        };
        vi.mocked(mockReservationService.createReservation).mockResolvedValue(err(error));

        // Act
        const response = await request(app).post('/api/reservations').send({
          userId: testUserId,
          bookId: testBookId,
        });

        // Assert
        expect(response.status).toBe(409);
        expect(response.body.error).toHaveProperty('type', 'ALREADY_RESERVED');
      });
    });
  });

  // ============================================
  // DELETE /api/reservations/:id - 予約キャンセル
  // ============================================

  describe('DELETE /api/reservations/:id - 予約キャンセル', () => {
    describe('正常系', () => {
      it('有効なリクエストで予約をキャンセルし204を返す', async () => {
        // Arrange
        vi.mocked(mockReservationService.cancelReservation).mockResolvedValue(ok(undefined));

        // Act
        const response = await request(app).delete(`/api/reservations/${testReservationId}`);

        // Assert
        expect(response.status).toBe(204);
      });

      it('サービスが正しいパラメータで呼び出される', async () => {
        // Arrange
        vi.mocked(mockReservationService.cancelReservation).mockResolvedValue(ok(undefined));

        // Act
        await request(app).delete(`/api/reservations/${testReservationId}`);

        // Assert
        expect(mockReservationService.cancelReservation).toHaveBeenCalledWith(testReservationId);
      });
    });

    describe('異常系', () => {
      it('存在しない予約の場合404を返す', async () => {
        // Arrange
        const error: ReservationError = {
          type: 'RESERVATION_NOT_FOUND',
          reservationId: testReservationId,
        };
        vi.mocked(mockReservationService.cancelReservation).mockResolvedValue(err(error));

        // Act
        const response = await request(app).delete(`/api/reservations/${testReservationId}`);

        // Assert
        expect(response.status).toBe(404);
        expect(response.body.error).toHaveProperty('type', 'RESERVATION_NOT_FOUND');
      });
    });
  });

  // ============================================
  // GET /api/users/:id/reservations - 利用者の予約一覧
  // ============================================

  describe('GET /api/users/:id/reservations - 利用者の予約一覧', () => {
    describe('正常系', () => {
      it('利用者の予約一覧を取得し200を返す', async () => {
        // Arrange
        const reservations: Reservation[] = [
          testReservation,
          {
            id: createReservationId('reservation-999'),
            userId: testUserId,
            bookId: createBookId('book-other'),
            reservedAt: new Date('2024-06-02T10:00:00Z'),
            notifiedAt: new Date('2024-06-05T10:00:00Z'),
            expiresAt: new Date('2024-06-12T10:00:00Z'),
            status: 'NOTIFIED',
            queuePosition: 1,
          },
        ];
        vi.mocked(mockReservationRepository.findByUserId).mockResolvedValue(reservations);

        // Act
        const response = await request(app).get(`/api/users/${testUserId}/reservations`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(2);
        expect(response.body[0]).toHaveProperty('id', testReservationId);
        expect(response.body[1]).toHaveProperty('status', 'NOTIFIED');
      });

      it('予約がない場合は空配列を返す', async () => {
        // Arrange
        vi.mocked(mockReservationRepository.findByUserId).mockResolvedValue([]);

        // Act
        const response = await request(app).get(`/api/users/${testUserId}/reservations`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(0);
      });

      it('リポジトリが正しいパラメータで呼び出される', async () => {
        // Arrange
        vi.mocked(mockReservationRepository.findByUserId).mockResolvedValue([]);

        // Act
        await request(app).get(`/api/users/${testUserId}/reservations`);

        // Assert
        expect(mockReservationRepository.findByUserId).toHaveBeenCalledWith(testUserId);
      });
    });
  });
});
