// Library Inventory System - Entry Point
import express from 'express';
import { securityHeadersMiddleware, sanitizeInputMiddleware } from './shared/index.js';

// サービス
import { createBookService } from './domains/book/book-service.js';
import { createSearchService } from './domains/book/search-service.js';
import { createLoanService } from './domains/loan/loan-service.js';
import { createUserService } from './domains/user/user-service.js';
import { createReservationService } from './domains/reservation/reservation-service.js';
import { createReportService } from './domains/report/report-service.js';

// コントローラー
import { createBookController } from './domains/book/book-controller.js';
import { createSearchController } from './domains/book/search-controller.js';
import { createLoanController } from './domains/loan/loan-controller.js';
import { createUserController } from './domains/user/user-controller.js';
import { createReservationController } from './domains/reservation/reservation-controller.js';
import { createReportController } from './domains/report/report-controller.js';

// データベース
import { DatabasePool, createDatabaseConfig } from './infrastructure/database/database.js';

// PostgreSQLリポジトリ
import {
  createPgBookRepository,
  createPgSearchRepository,
  createPgUserRepository,
  createPgLoanRepository,
  createPgReservationRepository,
  createPgReportRepository,
  createPgOverdueRecordRepository,
} from './infrastructure/repositories/index.js';

const app = express();
const PORT = process.env.PORT ?? 3000;

// セキュリティミドルウェア（CSPヘッダー設定等）
app.use(securityHeadersMiddleware);

// JSON パース
app.use(express.json());

// 入力サニタイズミドルウェア
app.use(sanitizeInputMiddleware);

// ============================================
// データベース接続
// ============================================

const dbConfig = createDatabaseConfig({
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  database: process.env.DB_NAME ?? 'library_db',
  user: process.env.DB_USER ?? 'library_user',
  password: process.env.DB_PASSWORD ?? 'library_password',
});

const pool = new DatabasePool(dbConfig);

// ============================================
// リポジトリ初期化（PostgreSQL）
// ============================================

const bookRepository = createPgBookRepository(pool);
const searchRepository = createPgSearchRepository(pool);
const userRepository = createPgUserRepository(pool);
const loanRepository = createPgLoanRepository(pool);
const reservationRepository = createPgReservationRepository(pool);
const reportRepository = createPgReportRepository(pool);
const overdueRecordRepository = createPgOverdueRecordRepository(pool);

// ============================================
// サービス初期化
// ============================================

const bookService = createBookService(bookRepository);
const searchService = createSearchService(searchRepository);
const userService = createUserService(userRepository);
const loanService = createLoanService(
  loanRepository,
  bookRepository,
  userRepository,
  overdueRecordRepository
);
const reservationService = createReservationService(
  reservationRepository,
  bookRepository,
  userRepository
);
const reportService = createReportService(reportRepository);

// ============================================
// コントローラー初期化
// ============================================

const bookRouter = createBookController(bookService);
const searchRouter = createSearchController(searchService);
const loanRouter = createLoanController(loanService);
const userRouter = createUserController(userService);
const reservationRouter = createReservationController(reservationService, reservationRepository);
const reportRouter = createReportController(reportService);

// ============================================
// ルート登録
// ============================================

// 注意: searchRouterを先にマウントして、/searchが/:idパラメータとして解釈されないようにする
app.use('/api/books', searchRouter);
app.use('/api/books', bookRouter);
app.use('/api/loans', loanRouter);
app.use('/api/users', userRouter);
app.use('/api/reservations', reservationRouter);
app.use('/api/reports', reportRouter);

// ヘルスチェック
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${String(PORT)}`);
  console.log(`API endpoints available:`);
  console.log(`  - GET  /api/books/search`);
  console.log(`  - GET  /api/books/:id`);
  console.log(`  - POST /api/books`);
  console.log(`  - GET  /api/users`);
  console.log(`  - GET  /api/loans`);
  console.log(`  - GET  /api/reservations`);
  console.log(`  - GET  /api/reports/statistics`);
});

export default app;
