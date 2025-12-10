/**
 * LoanService テスト
 *
 * TDDに従い、テストを先に記述します。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createLoanService, type LoanService } from './loan-service.js';
import type { LoanRepository } from './loan-repository.js';
import type { BookRepository } from '../book/book-repository.js';
import type { UserRepository } from '../user/user-repository.js';
import {
  createUserId,
  createCopyId,
  createLoanId,
  createBookId,
} from '../../shared/branded-types.js';
import { ok, err, isOk, isErr } from '../../shared/result.js';
import type { Loan, CreateLoanInput } from './types.js';
import type { User } from '../user/types.js';
import type { BookCopy, Book } from '../book/types.js';

// ============================================
// モックファクトリ
// ============================================

function createMockLoanRepository(): LoanRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    countActiveLoans: vi.fn(),
    findActiveByUserId: vi.fn(),
    findActiveByCopyId: vi.fn(),
    findActiveByMultipleCopyIds: vi.fn(),
    updateReturnedAt: vi.fn(),
  };
}

function createMockBookRepository(): Pick<
  BookRepository,
  'findCopyById' | 'updateCopy' | 'findById'
> {
  return {
    findCopyById: vi.fn(),
    updateCopy: vi.fn(),
    findById: vi.fn(),
  };
}

function createMockUserRepository(): Pick<UserRepository, 'findById'> {
  return {
    findById: vi.fn(),
  };
}

// ============================================
// テストデータ
// ============================================

const testUserId = createUserId('user-123');
const testCopyId = createCopyId('copy-456');
const testLoanId = createLoanId('loan-789');
const testBookId = createBookId('book-001');

const testUser: User = {
  id: testUserId,
  name: '山田太郎',
  address: '東京都渋谷区1-2-3',
  email: 'yamada@example.com',
  phone: '090-1234-5678',
  registeredAt: new Date('2024-01-01'),
  loanLimit: 5,
};

const testBookCopy: BookCopy = {
  id: testCopyId,
  bookId: testBookId,
  location: 'A棚-1段目',
  status: 'AVAILABLE',
  createdAt: new Date('2024-01-01'),
};

const testBook: Book = {
  id: testBookId,
  title: '吾輩は猫である',
  author: '夏目漱石',
  publisher: '岩波書店',
  publicationYear: 1905,
  isbn: '978-4-00-310101-7',
  category: '日本文学',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const testLoan: Loan = {
  id: testLoanId,
  userId: testUserId,
  bookCopyId: testCopyId,
  borrowedAt: new Date('2024-06-01'),
  dueDate: new Date('2024-06-15'),
  returnedAt: null,
};

// ============================================
// テスト
// ============================================

describe('LoanService', () => {
  let loanService: LoanService;
  let mockLoanRepository: ReturnType<typeof createMockLoanRepository>;
  let mockBookRepository: ReturnType<typeof createMockBookRepository>;
  let mockUserRepository: ReturnType<typeof createMockUserRepository>;

  beforeEach(() => {
    mockLoanRepository = createMockLoanRepository();
    mockBookRepository = createMockBookRepository();
    mockUserRepository = createMockUserRepository();
    loanService = createLoanService(mockLoanRepository, mockBookRepository, mockUserRepository);
  });

  describe('createLoan', () => {
    describe('正常系', () => {
      it('有効な入力で貸出を作成できる', async () => {
        // Arrange
        const input: CreateLoanInput = {
          userId: testUserId,
          bookCopyId: testCopyId,
        };

        vi.mocked(mockUserRepository.findById).mockResolvedValue(ok(testUser));
        vi.mocked(mockBookRepository.findCopyById).mockResolvedValue(ok(testBookCopy));
        vi.mocked(mockLoanRepository.countActiveLoans).mockResolvedValue(0);
        vi.mocked(mockLoanRepository.create).mockResolvedValue(ok(testLoan));
        vi.mocked(mockBookRepository.updateCopy).mockResolvedValue(
          ok({ ...testBookCopy, status: 'BORROWED' })
        );

        // Act
        const result = await loanService.createLoan(input);

        // Assert
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.id).toBe(testLoanId);
          expect(result.value.userId).toBe(testUserId);
          expect(result.value.bookCopyId).toBe(testCopyId);
        }
      });

      it('貸出作成時に蔵書状態がBORROWEDに更新される', async () => {
        // Arrange
        const input: CreateLoanInput = {
          userId: testUserId,
          bookCopyId: testCopyId,
        };

        vi.mocked(mockUserRepository.findById).mockResolvedValue(ok(testUser));
        vi.mocked(mockBookRepository.findCopyById).mockResolvedValue(ok(testBookCopy));
        vi.mocked(mockLoanRepository.countActiveLoans).mockResolvedValue(0);
        vi.mocked(mockLoanRepository.create).mockResolvedValue(ok(testLoan));
        vi.mocked(mockBookRepository.updateCopy).mockResolvedValue(
          ok({ ...testBookCopy, status: 'BORROWED' })
        );

        // Act
        await loanService.createLoan(input);

        // Assert
        expect(mockBookRepository.updateCopy).toHaveBeenCalledWith(testCopyId, 'BORROWED');
      });

      it('返却期限が14日後に設定される', async () => {
        // Arrange
        const input: CreateLoanInput = {
          userId: testUserId,
          bookCopyId: testCopyId,
        };

        vi.mocked(mockUserRepository.findById).mockResolvedValue(ok(testUser));
        vi.mocked(mockBookRepository.findCopyById).mockResolvedValue(ok(testBookCopy));
        vi.mocked(mockLoanRepository.countActiveLoans).mockResolvedValue(0);
        vi.mocked(mockLoanRepository.create).mockResolvedValue(ok(testLoan));
        vi.mocked(mockBookRepository.updateCopy).mockResolvedValue(
          ok({ ...testBookCopy, status: 'BORROWED' })
        );

        // Act
        await loanService.createLoan(input);

        // Assert
        expect(mockLoanRepository.create).toHaveBeenCalled();
        const createCall = vi.mocked(mockLoanRepository.create).mock.calls[0];
        if (createCall !== undefined) {
          const [, dueDate] = createCall;
          const today = new Date();
          const expectedDueDate = new Date(today);
          expectedDueDate.setDate(expectedDueDate.getDate() + 14);

          // 日付の日部分のみ比較（時刻は誤差あり）
          expect(dueDate.toDateString()).toBe(expectedDueDate.toDateString());
        }
      });
    });

    describe('異常系 - 利用者', () => {
      it('存在しない利用者の場合エラーを返す', async () => {
        // Arrange
        const input: CreateLoanInput = {
          userId: testUserId,
          bookCopyId: testCopyId,
        };

        vi.mocked(mockUserRepository.findById).mockResolvedValue(
          err({ type: 'NOT_FOUND', id: testUserId })
        );

        // Act
        const result = await loanService.createLoan(input);

        // Assert
        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.type).toBe('USER_NOT_FOUND');
        }
      });

      it('貸出上限に達している場合エラーを返す', async () => {
        // Arrange
        const input: CreateLoanInput = {
          userId: testUserId,
          bookCopyId: testCopyId,
        };

        const userAtLimit: User = { ...testUser, loanLimit: 3 };
        vi.mocked(mockUserRepository.findById).mockResolvedValue(ok(userAtLimit));
        vi.mocked(mockLoanRepository.countActiveLoans).mockResolvedValue(3);

        // Act
        const result = await loanService.createLoan(input);

        // Assert
        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.type).toBe('LOAN_LIMIT_EXCEEDED');
          if (result.error.type === 'LOAN_LIMIT_EXCEEDED') {
            expect(result.error.limit).toBe(3);
            expect(result.error.currentCount).toBe(3);
          }
        }
      });
    });

    describe('異常系 - 蔵書コピー', () => {
      it('存在しない蔵書コピーの場合エラーを返す', async () => {
        // Arrange
        const input: CreateLoanInput = {
          userId: testUserId,
          bookCopyId: testCopyId,
        };

        vi.mocked(mockUserRepository.findById).mockResolvedValue(ok(testUser));
        vi.mocked(mockBookRepository.findCopyById).mockResolvedValue(
          err({ type: 'NOT_FOUND', id: testCopyId })
        );

        // Act
        const result = await loanService.createLoan(input);

        // Assert
        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.type).toBe('COPY_NOT_FOUND');
        }
      });

      it('蔵書コピーが貸出中の場合エラーを返す', async () => {
        // Arrange
        const input: CreateLoanInput = {
          userId: testUserId,
          bookCopyId: testCopyId,
        };

        const borrowedCopy: BookCopy = { ...testBookCopy, status: 'BORROWED' };
        vi.mocked(mockUserRepository.findById).mockResolvedValue(ok(testUser));
        vi.mocked(mockBookRepository.findCopyById).mockResolvedValue(ok(borrowedCopy));
        vi.mocked(mockLoanRepository.countActiveLoans).mockResolvedValue(0);

        // Act
        const result = await loanService.createLoan(input);

        // Assert
        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.type).toBe('BOOK_NOT_AVAILABLE');
        }
      });

      it('蔵書コピーが予約済みの場合エラーを返す', async () => {
        // Arrange
        const input: CreateLoanInput = {
          userId: testUserId,
          bookCopyId: testCopyId,
        };

        const reservedCopy: BookCopy = { ...testBookCopy, status: 'RESERVED' };
        vi.mocked(mockUserRepository.findById).mockResolvedValue(ok(testUser));
        vi.mocked(mockBookRepository.findCopyById).mockResolvedValue(ok(reservedCopy));
        vi.mocked(mockLoanRepository.countActiveLoans).mockResolvedValue(0);

        // Act
        const result = await loanService.createLoan(input);

        // Assert
        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.type).toBe('BOOK_NOT_AVAILABLE');
        }
      });

      it('蔵書コピーがメンテナンス中の場合エラーを返す', async () => {
        // Arrange
        const input: CreateLoanInput = {
          userId: testUserId,
          bookCopyId: testCopyId,
        };

        const maintenanceCopy: BookCopy = { ...testBookCopy, status: 'MAINTENANCE' };
        vi.mocked(mockUserRepository.findById).mockResolvedValue(ok(testUser));
        vi.mocked(mockBookRepository.findCopyById).mockResolvedValue(ok(maintenanceCopy));
        vi.mocked(mockLoanRepository.countActiveLoans).mockResolvedValue(0);

        // Act
        const result = await loanService.createLoan(input);

        // Assert
        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.type).toBe('BOOK_NOT_AVAILABLE');
        }
      });
    });
  });

  describe('createLoanWithReceipt', () => {
    describe('正常系', () => {
      it('貸出完了時にレシート情報を返す', async () => {
        // Arrange
        const input: CreateLoanInput = {
          userId: testUserId,
          bookCopyId: testCopyId,
        };

        vi.mocked(mockUserRepository.findById).mockResolvedValue(ok(testUser));
        vi.mocked(mockBookRepository.findCopyById).mockResolvedValue(ok(testBookCopy));
        vi.mocked(mockBookRepository.findById).mockResolvedValue(ok(testBook));
        vi.mocked(mockLoanRepository.countActiveLoans).mockResolvedValue(0);
        vi.mocked(mockLoanRepository.create).mockResolvedValue(ok(testLoan));
        vi.mocked(mockBookRepository.updateCopy).mockResolvedValue(
          ok({ ...testBookCopy, status: 'BORROWED' })
        );

        // Act
        const result = await loanService.createLoanWithReceipt(input);

        // Assert
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.loan).toEqual(testLoan);
          expect(result.value.bookTitle).toBe('吾輩は猫である');
          expect(result.value.userName).toBe('山田太郎');
        }
      });

      it('レシートに返却期限が含まれる', async () => {
        // Arrange
        const input: CreateLoanInput = {
          userId: testUserId,
          bookCopyId: testCopyId,
        };

        vi.mocked(mockUserRepository.findById).mockResolvedValue(ok(testUser));
        vi.mocked(mockBookRepository.findCopyById).mockResolvedValue(ok(testBookCopy));
        vi.mocked(mockBookRepository.findById).mockResolvedValue(ok(testBook));
        vi.mocked(mockLoanRepository.countActiveLoans).mockResolvedValue(0);
        vi.mocked(mockLoanRepository.create).mockResolvedValue(ok(testLoan));
        vi.mocked(mockBookRepository.updateCopy).mockResolvedValue(
          ok({ ...testBookCopy, status: 'BORROWED' })
        );

        // Act
        const result = await loanService.createLoanWithReceipt(input);

        // Assert
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.loan.dueDate).toBeInstanceOf(Date);
        }
      });
    });

    describe('異常系', () => {
      it('貸出作成に失敗した場合はエラーを返す', async () => {
        // Arrange
        const input: CreateLoanInput = {
          userId: testUserId,
          bookCopyId: testCopyId,
        };

        vi.mocked(mockUserRepository.findById).mockResolvedValue(
          err({ type: 'NOT_FOUND', id: testUserId })
        );

        // Act
        const result = await loanService.createLoanWithReceipt(input);

        // Assert
        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.type).toBe('USER_NOT_FOUND');
        }
      });
    });
  });

  // ============================================
  // Task 5.3: 貸出状況表示機能
  // ============================================

  describe('getCopyLoanStatus', () => {
    describe('正常系', () => {
      it('貸出中の蔵書コピーの状態を取得できる', async () => {
        // Arrange
        const activeLoan: Loan = {
          ...testLoan,
          returnedAt: null,
        };
        vi.mocked(mockLoanRepository.findActiveByCopyId).mockResolvedValue(activeLoan);

        // Act
        const result = await loanService.getCopyLoanStatus(testCopyId);

        // Assert
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.isBorrowed).toBe(true);
          expect(result.value.loan).toEqual(activeLoan);
          expect(result.value.dueDate).toEqual(activeLoan.dueDate);
        }
      });

      it('貸出されていない蔵書コピーの状態を取得できる', async () => {
        // Arrange
        vi.mocked(mockLoanRepository.findActiveByCopyId).mockResolvedValue(null);

        // Act
        const result = await loanService.getCopyLoanStatus(testCopyId);

        // Assert
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.isBorrowed).toBe(false);
          expect(result.value.loan).toBeNull();
          expect(result.value.dueDate).toBeNull();
        }
      });
    });
  });

  describe('getBulkCopyLoanStatus', () => {
    describe('正常系', () => {
      const testCopyId2 = createCopyId('copy-789');
      const testCopyId3 = createCopyId('copy-abc');

      it('複数の蔵書コピーの貸出状態を一括取得できる', async () => {
        // Arrange
        const activeLoan: Loan = {
          ...testLoan,
          bookCopyId: testCopyId,
          returnedAt: null,
        };
        const copyIds = [testCopyId, testCopyId2, testCopyId3];

        vi.mocked(mockLoanRepository.findActiveByMultipleCopyIds).mockResolvedValue([activeLoan]);

        // Act
        const result = await loanService.getBulkCopyLoanStatus(copyIds);

        // Assert
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          const statusMap = result.value;
          expect(statusMap.get(testCopyId)?.isBorrowed).toBe(true);
          expect(statusMap.get(testCopyId)?.dueDate).toEqual(activeLoan.dueDate);
          expect(statusMap.get(testCopyId2)?.isBorrowed).toBe(false);
          expect(statusMap.get(testCopyId3)?.isBorrowed).toBe(false);
        }
      });

      it('空の蔵書コピーリストでも正常に動作する', async () => {
        // Arrange
        vi.mocked(mockLoanRepository.findActiveByMultipleCopyIds).mockResolvedValue([]);

        // Act
        const result = await loanService.getBulkCopyLoanStatus([]);

        // Assert
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.size).toBe(0);
        }
      });
    });
  });

  // ============================================
  // Task 6.1: 返却処理サービスの実装
  // ============================================

  describe('returnBook', () => {
    describe('正常系', () => {
      it('貸出IDで返却処理を行い、返却結果を返す', async () => {
        // Arrange
        const activeLoan: Loan = {
          ...testLoan,
          returnedAt: null,
        };
        const returnedLoan: Loan = {
          ...testLoan,
          returnedAt: new Date(),
        };

        vi.mocked(mockLoanRepository.findById).mockResolvedValue(ok(activeLoan));
        vi.mocked(mockLoanRepository.updateReturnedAt).mockResolvedValue(ok(returnedLoan));
        vi.mocked(mockBookRepository.updateCopy).mockResolvedValue(
          ok({ ...testBookCopy, status: 'AVAILABLE' })
        );

        // Act
        const result = await loanService.returnBook(testLoanId);

        // Assert
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.loan.id).toBe(testLoanId);
          expect(result.value.loan.returnedAt).not.toBeNull();
        }
      });

      it('返却処理で貸出記録に返却日が記録される', async () => {
        // Arrange
        const activeLoan: Loan = {
          ...testLoan,
          returnedAt: null,
        };
        const returnedLoan: Loan = {
          ...testLoan,
          returnedAt: new Date(),
        };

        vi.mocked(mockLoanRepository.findById).mockResolvedValue(ok(activeLoan));
        vi.mocked(mockLoanRepository.updateReturnedAt).mockResolvedValue(ok(returnedLoan));
        vi.mocked(mockBookRepository.updateCopy).mockResolvedValue(
          ok({ ...testBookCopy, status: 'AVAILABLE' })
        );

        // Act
        await loanService.returnBook(testLoanId);

        // Assert
        expect(mockLoanRepository.updateReturnedAt).toHaveBeenCalledWith(
          testLoanId,
          expect.any(Date)
        );
      });

      it('返却処理で蔵書状態がAVAILABLEに更新される', async () => {
        // Arrange
        const activeLoan: Loan = {
          ...testLoan,
          returnedAt: null,
        };
        const returnedLoan: Loan = {
          ...testLoan,
          returnedAt: new Date(),
        };

        vi.mocked(mockLoanRepository.findById).mockResolvedValue(ok(activeLoan));
        vi.mocked(mockLoanRepository.updateReturnedAt).mockResolvedValue(ok(returnedLoan));
        vi.mocked(mockBookRepository.updateCopy).mockResolvedValue(
          ok({ ...testBookCopy, status: 'AVAILABLE' })
        );

        // Act
        await loanService.returnBook(testLoanId);

        // Assert
        expect(mockBookRepository.updateCopy).toHaveBeenCalledWith(testCopyId, 'AVAILABLE');
      });

      it('返却期限内の返却では isOverdue が false になる', async () => {
        // Arrange
        const today = new Date();
        const futureDate = new Date(today);
        futureDate.setDate(futureDate.getDate() + 7); // 7日後が期限

        const activeLoan: Loan = {
          ...testLoan,
          dueDate: futureDate,
          returnedAt: null,
        };
        const returnedLoan: Loan = {
          ...activeLoan,
          returnedAt: today,
        };

        vi.mocked(mockLoanRepository.findById).mockResolvedValue(ok(activeLoan));
        vi.mocked(mockLoanRepository.updateReturnedAt).mockResolvedValue(ok(returnedLoan));
        vi.mocked(mockBookRepository.updateCopy).mockResolvedValue(
          ok({ ...testBookCopy, status: 'AVAILABLE' })
        );

        // Act
        const result = await loanService.returnBook(testLoanId);

        // Assert
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.isOverdue).toBe(false);
          expect(result.value.overdueDays).toBeUndefined();
        }
      });
    });

    describe('異常系', () => {
      it('存在しない貸出IDの場合エラーを返す', async () => {
        // Arrange
        vi.mocked(mockLoanRepository.findById).mockResolvedValue(
          err({ type: 'LOAN_NOT_FOUND', loanId: testLoanId })
        );

        // Act
        const result = await loanService.returnBook(testLoanId);

        // Assert
        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.type).toBe('LOAN_NOT_FOUND');
        }
      });

      it('既に返却済みの貸出の場合エラーを返す', async () => {
        // Arrange
        const alreadyReturnedLoan: Loan = {
          ...testLoan,
          returnedAt: new Date('2024-06-10'),
        };

        vi.mocked(mockLoanRepository.findById).mockResolvedValue(ok(alreadyReturnedLoan));

        // Act
        const result = await loanService.returnBook(testLoanId);

        // Assert
        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.type).toBe('ALREADY_RETURNED');
        }
      });
    });
  });
});
