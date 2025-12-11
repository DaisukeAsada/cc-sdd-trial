/**
 * Security Utilities
 *
 * APIセキュリティ対策のためのユーティリティ関数群
 * - 入力サニタイズ
 * - 追加バリデーション（UUID、正整数、文字列長）
 */

import { Result, ok, err } from './result.js';

// ============================================
// エラー型定義
// ============================================

/** セキュリティバリデーションエラー型 */
export type SecurityValidationError =
  | { type: 'INVALID_FORMAT'; field: string; message: string }
  | { type: 'VALUE_OUT_OF_RANGE'; field: string; message: string }
  | { type: 'STRING_TOO_SHORT'; field: string; message: string }
  | { type: 'STRING_TOO_LONG'; field: string; message: string };

// ============================================
// サニタイズオプション
// ============================================

/** サニタイズオプション */
export interface SanitizeOptions {
  /** HTMLエスケープを行うか（デフォルト: false） */
  escapeHtml?: boolean;
}

// ============================================
// 文字列サニタイズ
// ============================================

/**
 * HTML特殊文字をエスケープ
 */
function escapeHtmlChars(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 文字列をサニタイズ
 * - 前後の空白を除去
 * - NULLバイトを除去
 * - オプションでHTMLエスケープ
 *
 * @param value - サニタイズ対象の値
 * @param options - サニタイズオプション
 * @returns サニタイズされた文字列、またはnull/undefined
 */
export function sanitizeString(
  value: string | null | undefined,
  options: SanitizeOptions = {}
): string | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;

  // NULLバイトを除去（eslint no-control-regex 回避のためRegExpコンストラクタ使用）
  const nullByteRegex = new RegExp(String.fromCharCode(0), 'g');
  let sanitized = value.replace(nullByteRegex, '');

  // 前後の空白を除去
  sanitized = sanitized.trim();

  // HTMLエスケープ（オプション）
  if (options.escapeHtml === true) {
    sanitized = escapeHtmlChars(sanitized);
  }

  return sanitized;
}

/**
 * オブジェクト内のすべての文字列値をサニタイズ
 *
 * @param obj - サニタイズ対象のオブジェクト
 * @param options - サニタイズオプション
 * @returns サニタイズされたオブジェクト
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: SanitizeOptions = {}
): T {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    const value = obj[key];

    if (typeof value === 'string') {
      result[key] = sanitizeString(value, options);
    } else if (value === null) {
      result[key] = null;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeObject(value as Record<string, unknown>, options);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

// ============================================
// UUID バリデーション
// ============================================

/** UUID v4 正規表現パターン */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * UUID形式を検証
 *
 * @param value - 検証対象の値
 * @param fieldName - フィールド名（エラーメッセージ用、デフォルト: 'id'）
 * @returns Result<string, SecurityValidationError>
 */
export function validateUUID(
  value: string,
  fieldName = 'id'
): Result<string, SecurityValidationError> {
  if (!value || value.trim() === '') {
    return err({
      type: 'INVALID_FORMAT',
      field: fieldName,
      message: `${fieldName} is required`,
    });
  }

  if (!UUID_REGEX.test(value)) {
    return err({
      type: 'INVALID_FORMAT',
      field: fieldName,
      message: `${fieldName} must be a valid UUID`,
    });
  }

  return ok(value);
}

// ============================================
// 正整数バリデーション
// ============================================

/** 正整数バリデーションオプション */
export interface PositiveIntegerOptions {
  /** ゼロを許可するか（デフォルト: false） */
  allowZero?: boolean;
}

/**
 * 正整数を検証
 *
 * @param value - 検証対象の値
 * @param fieldName - フィールド名（エラーメッセージ用）
 * @param options - バリデーションオプション
 * @returns Result<number, SecurityValidationError>
 */
export function validatePositiveInteger(
  value: number,
  fieldName: string,
  options: PositiveIntegerOptions = {}
): Result<number, SecurityValidationError> {
  const { allowZero = false } = options;

  // NaN チェック
  if (Number.isNaN(value)) {
    return err({
      type: 'INVALID_FORMAT',
      field: fieldName,
      message: `${fieldName} must be a valid number`,
    });
  }

  // 整数チェック
  if (!Number.isInteger(value)) {
    return err({
      type: 'INVALID_FORMAT',
      field: fieldName,
      message: `${fieldName} must be an integer`,
    });
  }

  // 正数チェック（ゼロのオプショナル許可付き）
  if (allowZero) {
    if (value < 0) {
      return err({
        type: 'VALUE_OUT_OF_RANGE',
        field: fieldName,
        message: `${fieldName} must be zero or positive`,
      });
    }
  } else {
    if (value <= 0) {
      return err({
        type: 'VALUE_OUT_OF_RANGE',
        field: fieldName,
        message: `${fieldName} must be positive`,
      });
    }
  }

  return ok(value);
}

// ============================================
// 文字列長バリデーション
// ============================================

/** 文字列長バリデーションオプション */
export interface StringLengthOptions {
  /** 最小長（デフォルト: 0） */
  min?: number;
  /** 最大長（デフォルト: 1000） */
  max?: number;
}

/**
 * 文字列長を検証
 *
 * @param value - 検証対象の値
 * @param fieldName - フィールド名（エラーメッセージ用）
 * @param options - バリデーションオプション
 * @returns Result<string, SecurityValidationError>
 */
export function validateStringLength(
  value: string,
  fieldName: string,
  options: StringLengthOptions = {}
): Result<string, SecurityValidationError> {
  const { min = 0, max = 1000 } = options;

  if (value.length < min) {
    return err({
      type: 'STRING_TOO_SHORT',
      field: fieldName,
      message: `${fieldName} must be at least ${String(min)} characters`,
    });
  }

  if (value.length > max) {
    return err({
      type: 'STRING_TOO_LONG',
      field: fieldName,
      message: `${fieldName} must be at most ${String(max)} characters`,
    });
  }

  return ok(value);
}
