/**
 * 利用者API クライアント
 *
 * 利用者管理のREST APIとの通信を行うための関数群
 */

import { apiClient } from './api-client';

// ============================================
// 型定義
// ============================================

/** 利用者 */
export interface User {
  readonly id: string;
  readonly name: string;
  readonly address: string | null;
  readonly email: string;
  readonly phone: string | null;
  readonly registeredAt: string;
  readonly loanLimit: number;
}

/** 貸出サマリー（利用者詳細表示用） */
export interface LoanSummary {
  readonly id: string;
  readonly bookCopyId: string;
  readonly bookTitle: string;
  readonly borrowedAt: string;
  readonly dueDate: string;
  readonly returnedAt: string | null;
  readonly isOverdue: boolean;
}

/** 利用者詳細（貸出状況込み） */
export interface UserWithLoans {
  readonly user: User;
  readonly currentLoans: readonly LoanSummary[];
  readonly loanHistory: readonly LoanSummary[];
}

/** 利用者登録入力 */
export interface CreateUserInput {
  readonly name: string;
  readonly address?: string | null;
  readonly email: string;
  readonly phone?: string | null;
  readonly loanLimit?: number;
}

/** 利用者検索条件 */
export interface UserSearchCriteria {
  readonly name?: string;
  readonly userId?: string;
  readonly email?: string;
  readonly phone?: string;
}

/** APIエラーレスポンス */
export interface UserApiError {
  readonly error: {
    readonly type: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'DUPLICATE_EMAIL';
    readonly field?: string;
    readonly message?: string;
    readonly id?: string;
    readonly email?: string;
  };
}

// ============================================
// API 関数
// ============================================

const API_BASE = '/api/users';

/**
 * 利用者を登録
 */
export async function createUser(input: CreateUserInput): Promise<User> {
  return apiClient.post<User>(API_BASE, input);
}

/**
 * 利用者詳細を取得
 */
export async function getUser(id: string): Promise<User> {
  return apiClient.get<User>(`${API_BASE}/${id}`);
}

/**
 * 利用者を検索
 */
export async function searchUsers(criteria: UserSearchCriteria): Promise<readonly User[]> {
  const params = new URLSearchParams();
  if (criteria.name !== undefined) {
    params.append('name', criteria.name);
  }
  if (criteria.userId !== undefined) {
    params.append('userId', criteria.userId);
  }
  if (criteria.email !== undefined) {
    params.append('email', criteria.email);
  }
  if (criteria.phone !== undefined) {
    params.append('phone', criteria.phone);
  }
  const queryString = params.toString();
  const url = queryString !== '' ? `${API_BASE}/search?${queryString}` : `${API_BASE}/search`;
  return apiClient.get<readonly User[]>(url);
}

/**
 * 利用者の貸出履歴を取得
 */
export async function getUserLoans(id: string): Promise<UserWithLoans> {
  return apiClient.get<UserWithLoans>(`${API_BASE}/${id}/loans`);
}
