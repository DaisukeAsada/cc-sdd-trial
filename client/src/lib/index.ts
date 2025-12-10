export { apiClient, ApiError } from './api-client';
export {
  createBook,
  updateBook,
  deleteBook,
  getBook,
  getBooks,
  type Book,
  type CreateBookInput,
  type UpdateBookInput,
  type BookApiError,
} from './book-api';
export {
  searchBooks,
  type SearchBook,
  type SearchResult,
  type SearchParams,
  type SearchSortBy,
  type SearchSortOrder,
} from './search-api';
export {
  createLoan,
  getLoan,
  returnBook,
  type Loan,
  type LoanReceipt,
  type ReturnResult,
  type CreateLoanInput,
  type LoanApiError,
} from './loan-api';
export {
  createUser,
  getUser,
  searchUsers,
  getUserLoans,
  type User,
  type UserWithLoans,
  type LoanSummary,
  type CreateUserInput,
  type UserSearchCriteria,
  type UserApiError,
} from './user-api';
export {
  createReservation,
  cancelReservation,
  getUserReservations,
  type Reservation,
  type ReservationStatus,
  type CreateReservationInput,
  type ReservationApiError,
} from './reservation-api';
export {
  getStatisticsSummary,
  getPopularBooksRanking,
  getCategoryStatistics,
  exportToCsv,
  downloadCsv,
  type DateRange,
  type StatisticsSummary,
  type PopularBookItem,
  type PopularBooksRanking,
  type CategoryStatisticsItem,
  type CategoryStatistics,
  type ReportApiError,
} from './report-api';
