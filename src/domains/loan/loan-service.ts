/**
 * LoanService - 貸出管理サービス
 *
 * 貸出の作成・返却処理を提供します。
 */

import type { Result } from '../../shared/result.js';
import { ok, err, isErr } from '../../shared/result.js';
import type { CopyId, LoanId } from '../../shared/branded-types.js';
import type { LoanRepository } from './loan-repository.js';
import type { BookRepository } from '../book/book-repository.js';
import type { UserRepository } from '../user/user-repository.js';
import type {
  Loan,
  CreateLoanInput,
  LoanError,
  LoanReceipt,
  CopyLoanStatus,
  ReturnResult,
  CreateOverdueRecordInput,
} from './types.js';
import { DEFAULT_LOAN_DURATION_DAYS } from './types.js';
import type { OverdueRecordRepository } from './overdue-record-repository.js';

// ============================================
// サービスインターフェース
// ============================================

/** LoanService インターフェース */
export interface LoanService {
  /**
   * 新しい貸出を作成
   * @param input - 貸出作成入力（userId, bookCopyId）
   * @returns 作成された貸出またはエラー
   */
  createLoan(input: CreateLoanInput): Promise<Result<Loan, LoanError>>;

  /**
   * 新しい貸出を作成し、レシート情報を返す
   * @param input - 貸出作成入力（userId, bookCopyId）
   * @returns 貸出レシート（書籍タイトル、利用者名を含む）またはエラー
   */
  createLoanWithReceipt(input: CreateLoanInput): Promise<Result<LoanReceipt, LoanError>>;

  /**
   * 蔵書コピーの貸出状況を取得
   * @param copyId - 蔵書コピーID
   * @returns 貸出状況
   */
  getCopyLoanStatus(copyId: CopyId): Promise<Result<CopyLoanStatus, never>>;

  /**
   * 複数の蔵書コピーの貸出状況を一括取得
   * @param copyIds - 蔵書コピーIDの配列
   * @returns 蔵書コピーIDをキーとした貸出状況のMap
   */
  getBulkCopyLoanStatus(
    copyIds: readonly CopyId[]
  ): Promise<Result<Map<CopyId, CopyLoanStatus>, never>>;

  /**
   * IDで貸出を取得
   * @param id - 貸出ID
   * @returns 貸出またはエラー
   */
  getLoanById(id: LoanId): Promise<Result<Loan, LoanError>>;

  /**
   * 書籍を返却
   * @param loanId - 貸出ID
   * @returns 返却結果（延滞情報を含む）またはエラー
   */
  returnBook(loanId: LoanId): Promise<Result<ReturnResult, LoanError>>;
}

// ============================================
// サービス実装
// ============================================

/** LoanService 実装を作成 */
export function createLoanService(
  loanRepository: LoanRepository,
  bookRepository: Pick<BookRepository, 'findCopyById' | 'updateCopy' | 'findById'>,
  userRepository: Pick<UserRepository, 'findById'>,
  overdueRecordRepository: OverdueRecordRepository
): LoanService {
  return {
    async createLoan(input: CreateLoanInput): Promise<Result<Loan, LoanError>> {
      const { userId, bookCopyId } = input;

      // 1. 利用者の存在確認
      const userResult = await userRepository.findById(userId);
      if (isErr(userResult)) {
        return err({
          type: 'USER_NOT_FOUND',
          userId: userId,
        });
      }
      const user = userResult.value;

      // 2. 利用者の貸出上限チェック
      const activeLoansCount = await loanRepository.countActiveLoans(userId);
      if (activeLoansCount >= user.loanLimit) {
        return err({
          type: 'LOAN_LIMIT_EXCEEDED',
          userId: userId,
          limit: user.loanLimit,
          currentCount: activeLoansCount,
        });
      }

      // 3. 蔵書コピーの存在確認
      const copyResult = await bookRepository.findCopyById(bookCopyId);
      if (isErr(copyResult)) {
        return err({
          type: 'COPY_NOT_FOUND',
          copyId: bookCopyId,
        });
      }
      const copy = copyResult.value;

      // 4. 蔵書コピーの状態チェック（AVAILABLEのみ貸出可能）
      if (copy.status !== 'AVAILABLE') {
        return err({
          type: 'BOOK_NOT_AVAILABLE',
          copyId: bookCopyId,
        });
      }

      // 5. 返却期限を計算（今日 + DEFAULT_LOAN_DURATION_DAYS）
      const today = new Date();
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + DEFAULT_LOAN_DURATION_DAYS);

      // 6. 貸出記録の作成
      const loanResult = await loanRepository.create(input, dueDate);
      if (isErr(loanResult)) {
        return loanResult;
      }

      // 7. 蔵書コピーの状態を「BORROWED」に更新
      const updateResult = await bookRepository.updateCopy(bookCopyId, 'BORROWED');
      if (isErr(updateResult)) {
        // 注意: トランザクション管理が必要（ここでは簡略化）
        return err({
          type: 'VALIDATION_ERROR',
          field: 'bookCopy',
          message: '蔵書状態の更新に失敗しました',
        });
      }

      return loanResult;
    },

    async createLoanWithReceipt(input: CreateLoanInput): Promise<Result<LoanReceipt, LoanError>> {
      const { userId, bookCopyId } = input;

      // 1. 利用者の存在確認
      const userResult = await userRepository.findById(userId);
      if (isErr(userResult)) {
        return err({
          type: 'USER_NOT_FOUND',
          userId: userId,
        });
      }
      const user = userResult.value;

      // 2. 利用者の貸出上限チェック
      const activeLoansCount = await loanRepository.countActiveLoans(userId);
      if (activeLoansCount >= user.loanLimit) {
        return err({
          type: 'LOAN_LIMIT_EXCEEDED',
          userId: userId,
          limit: user.loanLimit,
          currentCount: activeLoansCount,
        });
      }

      // 3. 蔵書コピーの存在確認
      const copyResult = await bookRepository.findCopyById(bookCopyId);
      if (isErr(copyResult)) {
        return err({
          type: 'COPY_NOT_FOUND',
          copyId: bookCopyId,
        });
      }
      const copy = copyResult.value;

      // 4. 蔵書コピーの状態チェック（AVAILABLEのみ貸出可能）
      if (copy.status !== 'AVAILABLE') {
        return err({
          type: 'BOOK_NOT_AVAILABLE',
          copyId: bookCopyId,
        });
      }

      // 5. 書籍マスタを取得（レシート用）
      const bookResult = await bookRepository.findById(copy.bookId);
      if (isErr(bookResult)) {
        return err({
          type: 'VALIDATION_ERROR',
          field: 'book',
          message: '書籍情報の取得に失敗しました',
        });
      }
      const book = bookResult.value;

      // 6. 返却期限を計算（今日 + DEFAULT_LOAN_DURATION_DAYS）
      const today = new Date();
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + DEFAULT_LOAN_DURATION_DAYS);

      // 7. 貸出記録の作成
      const loanResult = await loanRepository.create(input, dueDate);
      if (isErr(loanResult)) {
        return loanResult;
      }

      // 8. 蔵書コピーの状態を「BORROWED」に更新
      const updateResult = await bookRepository.updateCopy(bookCopyId, 'BORROWED');
      if (isErr(updateResult)) {
        return err({
          type: 'VALIDATION_ERROR',
          field: 'bookCopy',
          message: '蔵書状態の更新に失敗しました',
        });
      }

      // 9. レシート情報を生成して返す
      const receipt: LoanReceipt = {
        loan: loanResult.value,
        bookTitle: book.title,
        userName: user.name,
      };

      return ok(receipt);
    },

    async getCopyLoanStatus(copyId: CopyId): Promise<Result<CopyLoanStatus, never>> {
      const activeLoan = await loanRepository.findActiveByCopyId(copyId);

      if (activeLoan === null) {
        return ok({
          isBorrowed: false,
          loan: null,
          dueDate: null,
        });
      }

      return ok({
        isBorrowed: true,
        loan: activeLoan,
        dueDate: activeLoan.dueDate,
      });
    },

    async getBulkCopyLoanStatus(
      copyIds: readonly CopyId[]
    ): Promise<Result<Map<CopyId, CopyLoanStatus>, never>> {
      const statusMap = new Map<CopyId, CopyLoanStatus>();

      if (copyIds.length === 0) {
        return ok(statusMap);
      }

      const activeLoans = await loanRepository.findActiveByMultipleCopyIds(copyIds);

      // 貸出中の蔵書コピーIDのセットを作成
      const borrowedCopyIds = new Map<CopyId, Loan>();
      for (const loan of activeLoans) {
        borrowedCopyIds.set(loan.bookCopyId, loan);
      }

      // 各コピーIDの状態を設定
      for (const copyId of copyIds) {
        const loan = borrowedCopyIds.get(copyId);
        if (loan !== undefined) {
          statusMap.set(copyId, {
            isBorrowed: true,
            loan: loan,
            dueDate: loan.dueDate,
          });
        } else {
          statusMap.set(copyId, {
            isBorrowed: false,
            loan: null,
            dueDate: null,
          });
        }
      }

      return ok(statusMap);
    },

    async getLoanById(id: LoanId): Promise<Result<Loan, LoanError>> {
      return await loanRepository.findById(id);
    },

    async returnBook(loanId: LoanId): Promise<Result<ReturnResult, LoanError>> {
      // 1. 貸出記録の取得
      const loanResult = await loanRepository.findById(loanId);
      if (isErr(loanResult)) {
        return loanResult;
      }
      const loan = loanResult.value;

      // 2. 既に返却済みかチェック
      if (loan.returnedAt !== null) {
        return err({
          type: 'ALREADY_RETURNED',
          loanId: loanId,
        });
      }

      // 3. 返却日を記録
      const now = new Date();
      const updateResult = await loanRepository.updateReturnedAt(loanId, now);
      if (isErr(updateResult)) {
        return updateResult;
      }

      // 4. 蔵書コピーの状態を「AVAILABLE」に更新
      const copyUpdateResult = await bookRepository.updateCopy(loan.bookCopyId, 'AVAILABLE');
      if (isErr(copyUpdateResult)) {
        return err({
          type: 'VALIDATION_ERROR',
          field: 'bookCopy',
          message: '蔵書状態の更新に失敗しました',
        });
      }

      // 5. 延滞判定
      const isOverdue = now > loan.dueDate;

      if (isOverdue) {
        const timeDiff = now.getTime() - loan.dueDate.getTime();
        const overdueDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        // 6. 延滞記録を作成（失敗しても返却処理は成功とする）
        const overdueInput: CreateOverdueRecordInput = {
          loanId: loanId,
          overdueDays: overdueDays,
        };
        const overdueRecordResult = await overdueRecordRepository.create(overdueInput);

        if (isErr(overdueRecordResult)) {
          // 延滞記録保存に失敗しても返却処理は成功
          return ok({
            loan: updateResult.value,
            isOverdue,
            overdueDays,
          });
        }

        return ok({
          loan: updateResult.value,
          isOverdue,
          overdueDays,
          overdueRecord: overdueRecordResult.value,
        });
      }

      return ok({
        loan: updateResult.value,
        isOverdue,
      });
    },
  };
}
