/**
 * Result<T, E> パターン
 *
 * 関数の成功/失敗を明示的に型で表現するためのユーティリティ。
 * 例外を投げる代わりに Result 型を返すことで、
 * エラーハンドリングを型システムで強制できます。
 */

// ============================================
// Result 型定義
// ============================================

/** 成功結果 */
export interface Ok<T> {
  readonly success: true;
  readonly value: T;
}

/** 失敗結果 */
export interface Err<E> {
  readonly success: false;
  readonly error: E;
}

/** Result 型（成功または失敗） */
export type Result<T, E> = Ok<T> | Err<E>;

// ============================================
// コンストラクタ関数
// ============================================

/**
 * 成功結果を作成
 * @param value - 成功時の値
 * @returns Ok<T>
 */
export function ok<T, E = never>(value: T): Result<T, E> {
  return { success: true, value };
}

/**
 * 失敗結果を作成
 * @param error - エラー情報
 * @returns Err<E>
 */
export function err<T, E>(error: E): Result<T, E> {
  return { success: false, error };
}

// ============================================
// 型ガード関数
// ============================================

/**
 * 結果が成功かどうかを判定
 * @param result - Result
 * @returns true if Ok
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.success === true;
}

/**
 * 結果が失敗かどうかを判定
 * @param result - Result
 * @returns true if Err
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result.success === false;
}

// ============================================
// 値取り出し関数
// ============================================

/**
 * 成功時の値を取り出す（失敗時は例外）
 * @param result - Result
 * @returns 成功時の値
 * @throws Error - 失敗結果の場合
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) {
    return result.value;
  }
  throw new Error('Cannot unwrap an error result');
}

/**
 * 成功時の値を取り出す（失敗時はデフォルト値）
 * @param result - Result
 * @param defaultValue - 失敗時のデフォルト値
 * @returns 成功時の値またはデフォルト値
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  if (isOk(result)) {
    return result.value;
  }
  return defaultValue;
}

// ============================================
// 変換関数
// ============================================

/**
 * 成功時の値を変換
 * @param result - Result
 * @param fn - 変換関数
 * @returns 変換後のResult
 */
export function map<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  if (isOk(result)) {
    return ok(fn(result.value));
  }
  return result;
}

/**
 * 失敗時のエラーを変換
 * @param result - Result
 * @param fn - 変換関数
 * @returns 変換後のResult
 */
export function mapErr<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  if (isErr(result)) {
    return err<T, F>(fn(result.error));
  }
  return result;
}

/**
 * 成功時に別のResult を返す処理をチェーン
 * @param result - Result
 * @param fn - Result を返す関数
 * @returns チェーン後のResult
 */
export function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  if (isOk(result)) {
    return fn(result.value);
  }
  return result;
}
