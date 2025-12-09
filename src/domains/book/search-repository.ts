/**
 * Search Repository Interface
 *
 * 蔵書検索データアクセスを担当するリポジトリのインターフェース定義。
 * 具体的な実装は Infrastructure 層で行います。
 */

import type { Book } from './types.js';

// ============================================
// 検索パラメータ型定義
// ============================================

/** ソート可能なフィールド */
export type SearchSortBy = 'title' | 'author' | 'publicationYear';

/** ソート順序 */
export type SearchSortOrder = 'asc' | 'desc';

/** 検索入力パラメータ */
export interface SearchBooksInput {
  /** 検索キーワード（タイトル、著者、ISBN、カテゴリで部分一致） */
  readonly keyword: string;
  /** ソートフィールド */
  readonly sortBy?: SearchSortBy;
  /** ソート順序 */
  readonly sortOrder?: SearchSortOrder;
}

/** 検索結果 */
export interface SearchBooksResult {
  /** 検索結果の書籍一覧 */
  readonly books: readonly Book[];
  /** 総件数 */
  readonly total: number;
}

// ============================================
// リポジトリインターフェース
// ============================================

/** 検索リポジトリ */
export interface SearchRepository {
  /**
   * 書籍を検索
   * @param input - 検索パラメータ
   * @returns 検索結果
   */
  search(input: SearchBooksInput): Promise<SearchBooksResult>;
}
