/**
 * バリデーションユーティリティ
 *
 * 共通のバリデーション機能を提供します。
 * - ISBN形式検証（ISBN-10, ISBN-13）
 * - 必須項目チェック
 */

import { Result, ok, err } from './result.js';

// ============================================
// エラー型定義
// ============================================

/** バリデーションエラー型 */
export type ValidationError =
  | { type: 'INVALID_ISBN'; message: string }
  | { type: 'REQUIRED_FIELD_MISSING'; field: string; message: string }
  | { type: 'INVALID_EMAIL'; message: string };

// ============================================
// ISBN バリデーション
// ============================================

/**
 * ISBN-10 のチェックディジットを検証
 * @param digits - ハイフンを除去した10桁の文字列
 * @returns 有効な場合 true
 */
function validateISBN10Checksum(digits: string): boolean {
  if (digits.length !== 10) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const char = digits.charAt(i);
    const digit = parseInt(char, 10);
    if (isNaN(digit)) return false;
    sum += digit * (10 - i);
  }

  // チェックディジット（最後の文字）
  const lastChar = digits.charAt(9).toUpperCase();
  const checkDigit = lastChar === 'X' ? 10 : parseInt(lastChar, 10);
  if (isNaN(checkDigit) && lastChar !== 'X') return false;

  sum += checkDigit;
  return sum % 11 === 0;
}

/**
 * ISBN-13 のチェックディジットを検証
 * @param digits - ハイフンを除去した13桁の文字列
 * @returns 有効な場合 true
 */
function validateISBN13Checksum(digits: string): boolean {
  if (digits.length !== 13) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const char = digits.charAt(i);
    const digit = parseInt(char, 10);
    if (isNaN(digit)) return false;
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }

  const checkDigit = parseInt(digits.charAt(12), 10);
  if (isNaN(checkDigit)) return false;

  const remainder = sum % 10;
  const expectedCheck = remainder === 0 ? 0 : 10 - remainder;
  return checkDigit === expectedCheck;
}

/**
 * ISBN形式を検証（ISBN-10 および ISBN-13 対応）
 * @param isbn - 検証対象のISBN文字列
 * @returns Result<string, ValidationError>
 */
export function validateISBN(
  isbn: string
): Result<string, ValidationError> {
  if (!isbn || isbn.trim() === '') {
    return err({
      type: 'INVALID_ISBN',
      message: 'ISBN is required',
    });
  }

  // ハイフンとスペースを除去
  const digits = isbn.replace(/[-\s]/g, '');

  // ISBN-10 の検証
  if (digits.length === 10) {
    if (validateISBN10Checksum(digits)) {
      return ok(isbn);
    }
    return err({
      type: 'INVALID_ISBN',
      message: 'Invalid ISBN-10 checksum',
    });
  }

  // ISBN-13 の検証
  if (digits.length === 13) {
    if (validateISBN13Checksum(digits)) {
      return ok(isbn);
    }
    return err({
      type: 'INVALID_ISBN',
      message: 'Invalid ISBN-13 checksum',
    });
  }

  return err({
    type: 'INVALID_ISBN',
    message: `Invalid ISBN format: expected 10 or 13 digits, got ${digits.length}`,
  });
}

// ============================================
// 必須項目バリデーション
// ============================================

/**
 * 必須項目の存在を検証
 * @param value - 検証対象の値
 * @param fieldName - フィールド名（エラーメッセージ用）
 * @returns Result<string, ValidationError>
 */
export function validateRequired(
  value: string | null | undefined,
  fieldName: string
): Result<string, ValidationError> {
  if (value === null || value === undefined || value.trim() === '') {
    return err({
      type: 'REQUIRED_FIELD_MISSING',
      field: fieldName,
      message: `${fieldName} is required`,
    });
  }
  return ok(value);
}

// ============================================
// メールアドレスバリデーション
// ============================================

/**
 * メールアドレス形式を検証
 * @param email - 検証対象のメールアドレス
 * @returns Result<string, ValidationError>
 */
export function validateEmail(
  email: string
): Result<string, ValidationError> {
  // 基本的なメール形式の正規表現
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return err({
      type: 'INVALID_EMAIL',
      message: 'Invalid email format',
    });
  }

  return ok(email);
}
