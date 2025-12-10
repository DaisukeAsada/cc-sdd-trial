/**
 * RBAC (Role-Based Access Control) - ロールベースアクセス制御
 *
 * エンドポイントごとの権限チェックミドルウェアを提供します。
 */

import type { Request, Response, NextFunction } from 'express';
import type { UserRole, SessionData } from './types.js';

// ============================================
// 型定義
// ============================================

/** 認証済みリクエスト（セッション情報を含む） */
export interface AuthenticatedRequest extends Request {
  session?: SessionData;
}

/** HTTPメソッド */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/** エンドポイントごとのロール設定 */
export type EndpointRoleConfig = Partial<Record<HttpMethod, readonly UserRole[]>>;

/** ロール設定（エンドポイントパス → メソッド → 許可ロール） */
export type RoleConfig = Record<string, EndpointRoleConfig>;

/** 権限エラーレスポンス */
export interface ForbiddenError {
  readonly type: 'FORBIDDEN';
  readonly message: string;
  readonly requiredRoles: readonly UserRole[];
  readonly userRole: UserRole;
}

/** 認証エラーレスポンス */
export interface UnauthorizedError {
  readonly type: 'UNAUTHORIZED';
  readonly message: string;
}

// ============================================
// ロール階層（admin は全ての権限を持つ）
// ============================================

/**
 * ロール階層マップ
 * 上位ロールが下位ロールの権限を含む
 */
const ROLE_HIERARCHY: Record<UserRole, readonly UserRole[]> = {
  admin: ['admin', 'librarian', 'patron'],
  librarian: ['librarian', 'patron'],
  patron: ['patron'],
};

// ============================================
// ヘルパー関数
// ============================================

/**
 * ユーザーが指定されたロールのいずれかを持っているか確認
 * @param userRole - ユーザーのロール
 * @param allowedRoles - 許可されたロールのリスト
 * @returns ロールを持っているかどうか
 */
export function hasRole(userRole: UserRole, allowedRoles: readonly UserRole[]): boolean {
  if (allowedRoles.length === 0) {
    return false;
  }

  // ユーザーのロールが持つ権限を取得
  const userRoles = ROLE_HIERARCHY[userRole];

  // 許可されたロールのいずれかがユーザーのロール階層に含まれているか
  return allowedRoles.some((role) => userRoles.includes(role));
}

/**
 * 指定されたエンドポイントとメソッドへのアクセスが許可されているか確認
 * @param path - エンドポイントパス
 * @param method - HTTPメソッド
 * @param userRole - ユーザーのロール
 * @param config - ロール設定
 * @returns アクセスが許可されているかどうか
 */
export function canAccessEndpoint(
  path: string,
  method: string,
  userRole: UserRole,
  config: RoleConfig
): boolean {
  const endpointConfig = config[path];
  if (endpointConfig === undefined) {
    return false;
  }

  const allowedRoles = endpointConfig[method as HttpMethod];
  if (allowedRoles === undefined) {
    return false;
  }

  return hasRole(userRole, allowedRoles);
}

// ============================================
// ミドルウェアファクトリ
// ============================================

/**
 * ロールガードミドルウェアを作成
 * @param allowedRoles - 許可されたロールのリスト
 * @returns Express ミドルウェア
 */
export function createRoleGuard(
  allowedRoles: readonly UserRole[]
): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    // セッションが存在しない場合は401
    if (req.session === undefined) {
      res.status(401).json({
        error: {
          type: 'UNAUTHORIZED',
          message: '認証が必要です',
        } satisfies UnauthorizedError,
      });
      return;
    }

    const userRole = req.session.role;

    // ロールチェック
    if (!hasRole(userRole, allowedRoles)) {
      res.status(403).json({
        error: {
          type: 'FORBIDDEN',
          message: 'この操作を実行する権限がありません',
          requiredRoles: allowedRoles,
          userRole,
        } satisfies ForbiddenError,
      });
      return;
    }

    next();
  };
}

// ============================================
// 事前定義ミドルウェア
// ============================================

/**
 * 認証が必要なエンドポイント用ミドルウェア
 * すべてのロールでアクセス可能
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (req.session === undefined) {
    res.status(401).json({
      error: {
        type: 'UNAUTHORIZED',
        message: '認証が必要です',
      } satisfies UnauthorizedError,
    });
    return;
  }

  next();
}

/**
 * 図書館員以上の権限が必要なエンドポイント用ミドルウェア
 * librarian, admin でアクセス可能
 */
export const requireLibrarian = createRoleGuard(['librarian', 'admin']);

/**
 * 管理者権限が必要なエンドポイント用ミドルウェア
 * admin のみアクセス可能
 */
export const requireAdmin = createRoleGuard(['admin']);

/**
 * 利用者以上の権限が必要なエンドポイント用ミドルウェア
 * patron, librarian, admin でアクセス可能
 */
export const requirePatron = createRoleGuard(['patron', 'librarian', 'admin']);

// ============================================
// セッション注入ミドルウェア
// ============================================

/**
 * セッション認証ミドルウェアを作成
 * CookieからセッションIDを取得し、セッションデータをリクエストに注入
 * @param validateSession - セッション検証関数
 * @returns Express ミドルウェア
 */
export function createSessionMiddleware(
  validateSession: (sessionId: string) => Promise<SessionData | null>
): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void> {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // Cookieからセッションを取得
    const sessionId = getSessionIdFromCookie(req);

    if (sessionId !== null) {
      const sessionData = await validateSession(sessionId);
      if (sessionData !== null) {
        req.session = sessionData;
      }
    }

    next();
  };
}

/**
 * Cookieヘッダーからセッションを取得
 */
function getSessionIdFromCookie(req: Request): string | null {
  const cookieHeader = req.headers.cookie;
  if (cookieHeader === undefined || cookieHeader === '') {
    return null;
  }

  const cookies = cookieHeader.split(';').reduce<Record<string, string>>((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    if (key !== undefined && value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {});

  const sessionId = cookies.sessionId;
  if (sessionId === undefined || sessionId === '') {
    return null;
  }

  return sessionId;
}

// ============================================
// デフォルトロール設定
// ============================================

/**
 * 図書館システムのデフォルトロール設定
 */
export const DEFAULT_ROLE_CONFIG: RoleConfig = {
  // 蔵書管理（図書館員・管理者のみ）
  '/api/books': {
    GET: ['patron', 'librarian', 'admin'],
    POST: ['librarian', 'admin'],
    PUT: ['librarian', 'admin'],
    DELETE: ['admin'],
  },

  // 蔵書検索（全員可）
  '/api/books/search': {
    GET: ['patron', 'librarian', 'admin'],
  },

  // 利用者管理（図書館員・管理者のみ）
  '/api/users': {
    GET: ['librarian', 'admin'],
    POST: ['librarian', 'admin'],
    PUT: ['librarian', 'admin'],
    DELETE: ['admin'],
  },

  // 貸出管理（図書館員・管理者のみ）
  '/api/loans': {
    GET: ['patron', 'librarian', 'admin'],
    POST: ['librarian', 'admin'],
  },

  // 予約管理（利用者も可）
  '/api/reservations': {
    GET: ['patron', 'librarian', 'admin'],
    POST: ['patron', 'librarian', 'admin'],
    DELETE: ['patron', 'librarian', 'admin'],
  },

  // レポート（管理者のみ）
  '/api/reports': {
    GET: ['admin'],
  },

  '/api/reports/summary': {
    GET: ['admin'],
  },

  '/api/reports/loans': {
    GET: ['admin'],
  },

  '/api/reports/popular': {
    GET: ['admin'],
  },

  '/api/reports/export': {
    GET: ['admin'],
  },
};
