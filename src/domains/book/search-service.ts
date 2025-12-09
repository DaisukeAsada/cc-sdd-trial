/**
 * SearchService - 蔵書検索サービス
 *
 * 蔵書検索処理を提供します。
 * タイトル、著者、ISBN、カテゴリによる部分一致検索と
 * 検索結果のソート機能を実装します。
 */

import type { Result } from '../../shared/result.js';
import { ok } from '../../shared/result.js';
import type {
  SearchRepository,
  SearchBooksInput,
  SearchBooksResult,
  SearchSortBy,
  SearchSortOrder,
} from './search-repository.js';

// ============================================
// サービスインターフェース
// ============================================

/** 検索サービスの検索入力 */
export interface SearchInput {
  /** 検索キーワード（タイトル、著者、ISBN、カテゴリで部分一致） */
  readonly keyword: string;
  /** ソートフィールド */
  readonly sortBy?: SearchSortBy;
  /** ソート順序 */
  readonly sortOrder?: SearchSortOrder;
}

/** SearchService インターフェース */
export interface SearchService {
  /**
   * 書籍を検索
   * @param input - 検索パラメータ
   * @returns 検索結果
   */
  search(input: SearchInput): Promise<Result<SearchBooksResult, never>>;
}

// ============================================
// サービス実装
// ============================================

/**
 * SearchServiceを作成
 * @param repository - 検索リポジトリ
 * @returns SearchService
 */
export function createSearchService(repository: SearchRepository): SearchService {
  return {
    async search(input: SearchInput): Promise<Result<SearchBooksResult, never>> {
      const searchParams: SearchBooksInput = {
        keyword: input.keyword,
        ...(input.sortBy !== undefined && { sortBy: input.sortBy }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      };

      const result = await repository.search(searchParams);

      return ok(result);
    },
  };
}
