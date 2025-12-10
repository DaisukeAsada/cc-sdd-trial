/**
 * AuthService - 認証サービス
 *
 * ログイン・ログアウト機能とセッション管理を提供します。
 */

import type { UserId } from '../../shared/branded-types.js';
import type { Result } from '../../shared/result.js';
import { ok, err, isErr } from '../../shared/result.js';
import type { SessionStore } from './session-store.js';
import { createSessionId } from './session-store.js';
import type {
  SessionId,
  SessionData,
  Session,
  LoginInput,
  LoginResult,
  UserRole,
  AuthError,
} from './types.js';
import { DEFAULT_SESSION_TTL_SECONDS } from './types.js';

// ============================================
// ユーザー認証リポジトリインターフェース
// ============================================

/** 認証用ユーザー情報 */
export interface AuthUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly role: UserRole;
}

/** ユーザー認証リポジトリインターフェース */
export interface UserAuthRepository {
  /**
   * メールアドレスでユーザーを検索
   * @param email - メールアドレス
   * @returns ユーザー（見つからない場合はnull）
   */
  findByEmail(email: string): Promise<AuthUser | null>;

  /**
   * パスワードを検証
   * @param password - 入力パスワード
   * @param hash - 保存されたハッシュ
   * @returns 一致するかどうか
   */
  validatePassword(password: string, hash: string): Promise<boolean>;
}

// ============================================
// サービスインターフェース
// ============================================

/** AuthService インターフェース */
export interface AuthService {
  /**
   * ログイン処理
   * @param input - ログイン入力（メールアドレス、パスワード）
   * @returns ログイン結果（セッション、ユーザー情報）またはエラー
   */
  login(input: LoginInput): Promise<Result<LoginResult, AuthError>>;

  /**
   * ログアウト処理
   * @param sessionId - セッションID
   * @returns 成功またはエラー
   */
  logout(sessionId: SessionId): Promise<Result<void, AuthError>>;

  /**
   * セッションを検証
   * @param sessionId - セッションID
   * @returns セッションデータ（無効な場合はnull）またはエラー
   */
  validateSession(sessionId: SessionId): Promise<Result<SessionData | null, AuthError>>;

  /**
   * セッションの有効期限を延長
   * @param sessionId - セッションID
   * @returns 更新されたセッションデータまたはエラー
   */
  refreshSession(sessionId: SessionId): Promise<Result<SessionData, AuthError>>;
}

// ============================================
// サービス設定
// ============================================

/** AuthService 設定 */
export interface AuthServiceConfig {
  readonly sessionStore: SessionStore;
  readonly userAuthRepository: UserAuthRepository;
  readonly sessionTtlSeconds?: number;
}

// ============================================
// サービス実装
// ============================================

/**
 * AuthServiceを作成
 * @param config - サービス設定
 * @returns AuthService
 */
export function createAuthService(config: AuthServiceConfig): AuthService {
  const {
    sessionStore,
    userAuthRepository,
    sessionTtlSeconds = DEFAULT_SESSION_TTL_SECONDS,
  } = config;

  return {
    async login(input: LoginInput): Promise<Result<LoginResult, AuthError>> {
      const { email, password } = input;

      // ユーザーを検索
      const user = await userAuthRepository.findByEmail(email);
      if (user === null) {
        return err({
          type: 'INVALID_CREDENTIALS',
          message: 'メールアドレスまたはパスワードが正しくありません',
        });
      }

      // パスワードを検証
      const isValid = await userAuthRepository.validatePassword(password, user.passwordHash);
      if (!isValid) {
        return err({
          type: 'INVALID_CREDENTIALS',
          message: 'メールアドレスまたはパスワードが正しくありません',
        });
      }

      // セッションを作成
      const sessionId = createSessionId();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + sessionTtlSeconds * 1000);

      const sessionData: SessionData = {
        userId: user.id as UserId,
        role: user.role,
        createdAt: now,
        expiresAt,
      };

      // セッションを保存
      const setResult = await sessionStore.set(sessionId, sessionData);
      if (isErr(setResult)) {
        return err(setResult.error);
      }

      const session: Session = {
        id: sessionId,
        data: sessionData,
      };

      return ok({
        session,
        user: {
          id: user.id as UserId,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    },

    async logout(sessionId: SessionId): Promise<Result<void, AuthError>> {
      const deleteResult = await sessionStore.delete(sessionId);
      if (isErr(deleteResult)) {
        return err(deleteResult.error);
      }
      return ok(undefined);
    },

    async validateSession(sessionId: SessionId): Promise<Result<SessionData | null, AuthError>> {
      const getResult = await sessionStore.get(sessionId);
      if (isErr(getResult)) {
        return err(getResult.error);
      }

      const sessionData = getResult.value;
      if (sessionData === null) {
        return ok(null);
      }

      // 有効期限チェック
      if (sessionData.expiresAt.getTime() < Date.now()) {
        // 期限切れのセッションを削除
        await sessionStore.delete(sessionId);
        return ok(null);
      }

      return ok(sessionData);
    },

    async refreshSession(sessionId: SessionId): Promise<Result<SessionData, AuthError>> {
      const getResult = await sessionStore.get(sessionId);
      if (isErr(getResult)) {
        return err(getResult.error);
      }

      const sessionData = getResult.value;
      if (sessionData === null) {
        return err({
          type: 'SESSION_NOT_FOUND',
          sessionId,
        });
      }

      // 新しい有効期限を計算
      const newExpiresAt = new Date(Date.now() + sessionTtlSeconds * 1000);

      const refreshResult = await sessionStore.refresh(sessionId, newExpiresAt);
      if (isErr(refreshResult)) {
        return err(refreshResult.error);
      }

      return ok({
        ...sessionData,
        expiresAt: newExpiresAt,
      });
    },
  };
}
