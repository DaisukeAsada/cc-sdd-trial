/**
 * Branded Types for type-safe ID management
 *
 * Branded Types（別名: Nominal Types, Opaque Types）は、
 * プリミティブ型に追加の型情報を付与することで、
 * コンパイル時に異なるIDの誤用を防止します。
 */

// Brand シンボル（ユニークなブランドを作成するために使用）
declare const brand: unique symbol;

/**
 * Brand 型定義
 * T: 基底型（通常は string）
 * B: ブランド識別子
 */
type Brand<T, B extends string> = T & { readonly [brand]: B };

// ============================================
// Branded Type 定義
// ============================================

/** 書籍ID */
export type BookId = Brand<string, 'BookId'>;

/** 利用者ID */
export type UserId = Brand<string, 'UserId'>;

/** 貸出ID */
export type LoanId = Brand<string, 'LoanId'>;

/** 予約ID */
export type ReservationId = Brand<string, 'ReservationId'>;

/** 蔵書コピーID */
export type CopyId = Brand<string, 'CopyId'>;

// ============================================
// ファクトリ関数
// ============================================

/**
 * BookIdを作成
 * @param value - ID文字列
 * @returns BookId
 * @throws Error - 空文字列の場合
 */
export function createBookId(value: string): BookId {
  if (!value || value.trim() === '') {
    throw new Error('BookId cannot be empty');
  }
  return value as BookId;
}

/**
 * UserIdを作成
 * @param value - ID文字列
 * @returns UserId
 * @throws Error - 空文字列の場合
 */
export function createUserId(value: string): UserId {
  if (!value || value.trim() === '') {
    throw new Error('UserId cannot be empty');
  }
  return value as UserId;
}

/**
 * LoanIdを作成
 * @param value - ID文字列
 * @returns LoanId
 * @throws Error - 空文字列の場合
 */
export function createLoanId(value: string): LoanId {
  if (!value || value.trim() === '') {
    throw new Error('LoanId cannot be empty');
  }
  return value as LoanId;
}

/**
 * ReservationIdを作成
 * @param value - ID文字列
 * @returns ReservationId
 * @throws Error - 空文字列の場合
 */
export function createReservationId(value: string): ReservationId {
  if (!value || value.trim() === '') {
    throw new Error('ReservationId cannot be empty');
  }
  return value as ReservationId;
}

/**
 * CopyIdを作成
 * @param value - ID文字列
 * @returns CopyId
 * @throws Error - 空文字列の場合
 */
export function createCopyId(value: string): CopyId {
  if (!value || value.trim() === '') {
    throw new Error('CopyId cannot be empty');
  }
  return value as CopyId;
}
