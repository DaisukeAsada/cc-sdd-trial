// Book domain - 蔵書管理

// 型定義
export type {
  Book,
  BookCopy,
  BookCopyStatus,
  CreateBookInput,
  UpdateBookInput,
  BookError,
} from './types.js';

// リポジトリ
export type { BookRepository } from './book-repository.js';

// サービス
export type { BookService } from './book-service.js';
export { createBookService } from './book-service.js';
