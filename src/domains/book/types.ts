/**
 * Book Domain - 型定義
 *
 * 蔵書管理ドメインの型定義を提供します。
 */

import type { BookId, CopyId } from '../../shared/branded-types.js';

// ============================================
// 書籍マスタ型定義
// ============================================

/** 書籍マスタ */
export interface Book {
  readonly id: BookId;
  readonly title: string;
  readonly author: string;
  readonly publisher: string | null;
  readonly publicationYear: number | null;
  readonly isbn: string;
  readonly category: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** 書籍登録入力 */
export interface CreateBookInput {
  readonly title: string;
  readonly author: string;
  readonly publisher?: string | null;
  readonly publicationYear?: number | null;
  readonly isbn: string;
  readonly category?: string | null;
}

/** 書籍更新入力 */
export interface UpdateBookInput {
  readonly title?: string;
  readonly author?: string;
  readonly publisher?: string | null;
  readonly publicationYear?: number | null;
  readonly isbn?: string;
  readonly category?: string | null;
}

// ============================================
// 蔵書コピー型定義
// ============================================

/** 蔵書コピーステータス */
export type BookCopyStatus = 'AVAILABLE' | 'BORROWED' | 'RESERVED' | 'MAINTENANCE';

/** 蔵書コピー */
export interface BookCopy {
  readonly id: CopyId;
  readonly bookId: BookId;
  readonly location: string;
  readonly status: BookCopyStatus;
  readonly createdAt: Date;
}

// ============================================
// エラー型定義
// ============================================

/** 書籍ドメインエラー */
export type BookError =
  | { readonly type: 'VALIDATION_ERROR'; readonly field: string; readonly message: string }
  | { readonly type: 'DUPLICATE_ISBN'; readonly isbn: string }
  | { readonly type: 'NOT_FOUND'; readonly id: string };
