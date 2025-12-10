/**
 * Auth Domain - エクスポート
 *
 * 認証・認可ドメインの公開APIを提供します。
 */

// 型
export type {
  SessionId,
  UserRole,
  SessionData,
  Session,
  LoginInput,
  LoginResult,
  SessionStoreConfig,
  AuthError,
} from './types.js';

export { DEFAULT_SESSION_TTL_SECONDS, DEFAULT_SESSION_KEY_PREFIX } from './types.js';

// セッションストア
export type { SessionStore } from './session-store.js';
export {
  createSessionId,
  createInMemorySessionStore,
  createRedisSessionStore,
} from './session-store.js';

// 認証サービス
export type { AuthService, UserAuthRepository, AuthUser } from './auth-service.js';
export { createAuthService } from './auth-service.js';

// コントローラー
export { createAuthController } from './auth-controller.js';

// RBAC (Role-Based Access Control)
export type {
  AuthenticatedRequest,
  HttpMethod,
  EndpointRoleConfig,
  RoleConfig,
  ForbiddenError,
  UnauthorizedError,
} from './rbac.js';

export {
  hasRole,
  canAccessEndpoint,
  createRoleGuard,
  createSessionMiddleware,
  requireAuth,
  requireLibrarian,
  requireAdmin,
  requirePatron,
  DEFAULT_ROLE_CONFIG,
} from './rbac.js';
