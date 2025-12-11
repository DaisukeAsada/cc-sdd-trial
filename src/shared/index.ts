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

// ============================================
// Security（セキュリティ）
// ============================================
export {
  SecurityValidationError,
  SanitizeOptions,
  PositiveIntegerOptions,
  StringLengthOptions,
  sanitizeString,
  sanitizeObject,
  validateUUID,
  validatePositiveInteger,
  validateStringLength,
} from './security.js';

export {
  BuiltQuery,
  QueryBuilder,
  securityHeadersMiddleware,
  sanitizeInputMiddleware,
  validateRequestParams,
  createQueryBuilder,
} from './security-middleware.js';
