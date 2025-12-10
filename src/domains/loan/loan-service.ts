/**
 * LoanService - 貸出管理サービス
 *
 * 貸出の作成・返却処理を提供します。
 */

import type { Result } from '../../shared/result.js';
import { ok, err, isErr } from '../../shared/result.js';
import type { LoanRepository } from './loan-repository.js';
import type { BookRepository } from '../book/book-repository.js';
import type { UserRepository } from '../user/user-repository.js';
import type { Loan, CreateLoanInput, LoanError, LoanReceipt } from './types.js';
import { DEFAULT_LOAN_DURATION_DAYS } from './types.js';

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
}

// ============================================
// サービス実装
// ============================================

/** LoanService 実装を作成 */
export function createLoanService(
  loanRepository: LoanRepository,
  bookRepository: Pick<BookRepository, 'findCopyById' | 'updateCopy' | 'findById'>,
  userRepository: Pick<UserRepository, 'findById'>
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
  };
}
