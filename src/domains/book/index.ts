// Book domain - 蔵書管理

// 型定義
export type {
  Book,
  BookCopy,
  BookCopyStatus,
  CreateBookInput,
  UpdateBookInput,
  CreateCopyInput,
  BookError,
} from './types.js';

// リポジトリ
export type { BookRepository } from './book-repository.js';
export type {
  SearchRepository,
  SearchBooksInput,
  SearchBooksResult,
  SearchSortBy,
  SearchSortOrder,
} from './search-repository.js';

// サービス
export type { BookService } from './book-service.js';
export { createBookService } from './book-service.js';

// 検索サービス
export type { SearchService, SearchInput } from './search-service.js';
export { createSearchService } from './search-service.js';

// コントローラー
export { createBookController } from './book-controller.js';
