/**
 * LoanController テスト
 *
 * TDDに従い、貸出管理REST APIのテストを先に記述します。
 *
 * エンドポイント:
 * - POST /api/loans - 貸出処理
 * - GET /api/loans/:id - 貸出詳細
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { createLoanController } from './loan-controller.js';
import type { LoanService } from './loan-service.js';
import { createUserId, createCopyId, createLoanId } from '../../shared/branded-types.js';
import { ok, err } from '../../shared/result.js';
import type { Loan, LoanReceipt, LoanError } from './types.js';

// ============================================
// モックファクトリ
// ============================================

function createMockLoanService(): LoanService {
  return {
    createLoan: vi.fn(),
    createLoanWithReceipt: vi.fn(),
    getCopyLoanStatus: vi.fn(),
    getBulkCopyLoanStatus: vi.fn(),
    getLoanById: vi.fn(),
    returnBook: vi.fn(),
  };
}

// ============================================
// テストデータ
// ============================================

const testUserId = createUserId('user-123');
const testCopyId = createCopyId('copy-456');
const testLoanId = createLoanId('loan-789');

const testLoan: Loan = {
  id: testLoanId,
  userId: testUserId,
  bookCopyId: testCopyId,
  borrowedAt: new Date('2024-06-01'),
  dueDate: new Date('2024-06-15'),
  returnedAt: null,
};

const testLoanReceipt: LoanReceipt = {
  loan: testLoan,
  bookTitle: '吾輩は猫である',
  userName: '山田太郎',
};

// ============================================
// テストセットアップ
// ============================================

function createTestApp(loanService: LoanService): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/loans', createLoanController(loanService));
  return app;
}

// ============================================
// テスト
// ============================================

describe('LoanController', () => {
  let mockLoanService: ReturnType<typeof createMockLoanService>;
  let app: Express;

  beforeEach(() => {
    mockLoanService = createMockLoanService();
    app = createTestApp(mockLoanService);
  });

  describe('POST /api/loans - 貸出処理', () => {
    describe('正常系', () => {
      it('有効なリクエストで貸出を作成し201を返す', async () => {
        // Arrange
        vi.mocked(mockLoanService.createLoanWithReceipt).mockResolvedValue(ok(testLoanReceipt));

        // Act
        const response = await request(app).post('/api/loans').send({
          userId: testUserId,
          bookCopyId: testCopyId,
        });

        // Assert
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('loan');
        expect(response.body).toHaveProperty('bookTitle', '吾輩は猫である');
        expect(response.body).toHaveProperty('userName', '山田太郎');
      });

      it('サービスが正しいパラメータで呼び出される', async () => {
        // Arrange
        vi.mocked(mockLoanService.createLoanWithReceipt).mockResolvedValue(ok(testLoanReceipt));

        // Act
        await request(app).post('/api/loans').send({
          userId: testUserId,
          bookCopyId: testCopyId,
        });

        // Assert
        expect(mockLoanService.createLoanWithReceipt).toHaveBeenCalledWith({
          userId: testUserId,
          bookCopyId: testCopyId,
        });
      });
    });

    describe('異常系 - バリデーションエラー', () => {
      it('userIdが未指定の場合400を返す', async () => {
        // Act
        const response = await request(app).post('/api/loans').send({
          bookCopyId: testCopyId,
        });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.error).toHaveProperty('type', 'VALIDATION_ERROR');
      });

      it('bookCopyIdが未指定の場合400を返す', async () => {
        // Act
        const response = await request(app).post('/api/loans').send({
          userId: testUserId,
        });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.error).toHaveProperty('type', 'VALIDATION_ERROR');
      });
    });

    describe('異常系 - 利用者エラー', () => {
      it('存在しない利用者の場合404を返す', async () => {
        // Arrange
        const error: LoanError = {
          type: 'USER_NOT_FOUND',
          userId: testUserId,
        };
        vi.mocked(mockLoanService.createLoanWithReceipt).mockResolvedValue(err(error));

        // Act
        const response = await request(app).post('/api/loans').send({
          userId: testUserId,
          bookCopyId: testCopyId,
        });

        // Assert
        expect(response.status).toBe(404);
        expect(response.body.error).toHaveProperty('type', 'USER_NOT_FOUND');
      });

      it('貸出上限に達している場合409を返す', async () => {
        // Arrange
        const error: LoanError = {
          type: 'LOAN_LIMIT_EXCEEDED',
          userId: testUserId,
          limit: 5,
          currentCount: 5,
        };
        vi.mocked(mockLoanService.createLoanWithReceipt).mockResolvedValue(err(error));

        // Act
        const response = await request(app).post('/api/loans').send({
          userId: testUserId,
          bookCopyId: testCopyId,
        });

        // Assert
        expect(response.status).toBe(409);
        expect(response.body.error).toHaveProperty('type', 'LOAN_LIMIT_EXCEEDED');
      });
    });

    describe('異常系 - 蔵書コピーエラー', () => {
      it('存在しない蔵書コピーの場合404を返す', async () => {
        // Arrange
        const error: LoanError = {
          type: 'COPY_NOT_FOUND',
          copyId: testCopyId,
        };
        vi.mocked(mockLoanService.createLoanWithReceipt).mockResolvedValue(err(error));

        // Act
        const response = await request(app).post('/api/loans').send({
          userId: testUserId,
          bookCopyId: testCopyId,
        });

        // Assert
        expect(response.status).toBe(404);
        expect(response.body.error).toHaveProperty('type', 'COPY_NOT_FOUND');
      });

      it('蔵書コピーが貸出不可の場合409を返す', async () => {
        // Arrange
        const error: LoanError = {
          type: 'BOOK_NOT_AVAILABLE',
          copyId: testCopyId,
        };
        vi.mocked(mockLoanService.createLoanWithReceipt).mockResolvedValue(err(error));

        // Act
        const response = await request(app).post('/api/loans').send({
          userId: testUserId,
          bookCopyId: testCopyId,
        });

        // Assert
        expect(response.status).toBe(409);
        expect(response.body.error).toHaveProperty('type', 'BOOK_NOT_AVAILABLE');
      });
    });
  });

  describe('GET /api/loans/:id - 貸出詳細', () => {
    describe('正常系', () => {
      it('存在する貸出の詳細を取得して200を返す', async () => {
        // Arrange
        vi.mocked(mockLoanService.getLoanById).mockResolvedValue(ok(testLoan));

        // Act
        const response = await request(app).get(`/api/loans/${testLoanId}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id', testLoanId);
        expect(response.body).toHaveProperty('userId', testUserId);
        expect(response.body).toHaveProperty('bookCopyId', testCopyId);
      });
    });

    describe('異常系', () => {
      it('存在しない貸出の場合404を返す', async () => {
        // Arrange
        const error: LoanError = {
          type: 'LOAN_NOT_FOUND',
          loanId: testLoanId,
        };
        vi.mocked(mockLoanService.getLoanById).mockResolvedValue(err(error));

        // Act
        const response = await request(app).get(`/api/loans/${testLoanId}`);

        // Assert
        expect(response.status).toBe(404);
        expect(response.body.error).toHaveProperty('type', 'LOAN_NOT_FOUND');
      });
    });
  });
});
