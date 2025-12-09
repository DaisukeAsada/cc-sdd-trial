// Shared utilities and types
// ============================================
// Branded Types（型安全なID管理）
// ============================================
export {
  BookId,
  UserId,
  LoanId,
  ReservationId,
  CopyId,
  createBookId,
  createUserId,
  createLoanId,
  createReservationId,
  createCopyId,
} from './branded-types.js';

// ============================================
// Result Pattern（エラーハンドリング）
// ============================================
export {
  Result,
  Ok,
  Err,
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
  map,
  mapErr,
  flatMap,
} from './result.js';

// ============================================
// Validation（バリデーション）
// ============================================
export { ValidationError, validateISBN, validateRequired } from './validation.js';
