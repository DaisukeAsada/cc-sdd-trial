/**
 * 貸出API クライアント
 *
 * 貸出管理のREST APIとの通信を行うための関数群
 */

import { apiClient } from './api-client';

// ============================================
// 型定義
// ============================================

/** 貸出 */
export interface Loan {
  readonly id: string;
  readonly userId: string;
  readonly bookCopyId: string;
  readonly borrowedAt: string;
  readonly dueDate: string;
  readonly returnedAt: string | null;
}

/** 貸出レシート */
export interface LoanReceipt {
  readonly loan: Loan;
  readonly bookTitle: string;
  readonly userName: string;
}

/** 返却結果 */
export interface ReturnResult {
  readonly loan: Loan;
  readonly isOverdue: boolean;
  readonly overdueDays?: number;
  readonly overdueRecord?: {
    readonly id: string;
    readonly loanId: string;
    readonly overdueDays: number;
    readonly recordedAt: string;
  };
}

/** 貸出作成入力 */
export interface CreateLoanInput {
  readonly userId: string;
  readonly bookCopyId: string;
}

/** APIエラーレスポンス */
export interface LoanApiError {
  readonly error: {
    readonly type:
      | 'VALIDATION_ERROR'
      | 'USER_NOT_FOUND'
      | 'COPY_NOT_FOUND'
      | 'LOAN_NOT_FOUND'
      | 'BOOK_NOT_AVAILABLE'
      | 'LOAN_LIMIT_EXCEEDED'
      | 'ALREADY_RETURNED';
    readonly field?: string;
    readonly message?: string;
    readonly userId?: string;
    readonly copyId?: string;
    readonly loanId?: string;
    readonly limit?: number;
    readonly currentCount?: number;
  };
}

// ============================================
// API 関数
// ============================================

const API_BASE = '/api/loans';

/**
 * 貸出を作成
 */
export async function createLoan(input: CreateLoanInput): Promise<LoanReceipt> {
  return apiClient.post<LoanReceipt>(API_BASE, input);
}

/**
 * 貸出詳細を取得
 */
export async function getLoan(id: string): Promise<Loan> {
  return apiClient.get<Loan>(`${API_BASE}/${id}`);
}

/**
 * 返却処理
 */
export async function returnBook(loanId: string): Promise<ReturnResult> {
  return apiClient.post<ReturnResult>(`${API_BASE}/${loanId}/return`, {});
}
