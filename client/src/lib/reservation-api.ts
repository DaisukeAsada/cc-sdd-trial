/**
 * 予約API クライアント
 *
 * 予約管理のREST APIとの通信を行うための関数群
 */

import { apiClient } from './api-client';

// ============================================
// 型定義
// ============================================

/** 予約ステータス */
export type ReservationStatus =
  | 'PENDING'
  | 'NOTIFIED'
  | 'FULFILLED'
  | 'EXPIRED'
  | 'CANCELLED';

/** 予約 */
export interface Reservation {
  readonly id: string;
  readonly userId: string;
  readonly bookId: string;
  readonly reservedAt: string;
  readonly notifiedAt: string | null;
  readonly expiresAt: string | null;
  readonly status: ReservationStatus;
  readonly queuePosition: number;
}

/** 予約作成入力 */
export interface CreateReservationInput {
  readonly userId: string;
  readonly bookId: string;
}

/** APIエラーレスポンス */
export interface ReservationApiError {
  readonly error: {
    readonly type:
      | 'VALIDATION_ERROR'
      | 'BOOK_AVAILABLE'
      | 'ALREADY_RESERVED'
      | 'RESERVATION_NOT_FOUND'
      | 'BOOK_NOT_FOUND'
      | 'USER_NOT_FOUND';
    readonly field?: string;
    readonly message?: string;
    readonly userId?: string;
    readonly bookId?: string;
    readonly reservationId?: string;
  };
}

// ============================================
// API 関数
// ============================================

const API_BASE = '/api';

/**
 * 予約を作成
 */
export async function createReservation(
  input: CreateReservationInput
): Promise<Reservation> {
  return apiClient.post<Reservation>(`${API_BASE}/reservations`, input);
}

/**
 * 予約をキャンセル
 */
export async function cancelReservation(reservationId: string): Promise<void> {
  return apiClient.delete<void>(`${API_BASE}/reservations/${reservationId}`);
}

/**
 * 利用者の予約一覧を取得
 */
export async function getUserReservations(
  userId: string
): Promise<Reservation[]> {
  return apiClient.get<Reservation[]>(`${API_BASE}/users/${userId}/reservations`);
}
