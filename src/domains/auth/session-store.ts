/**
 * SessionStore - セッションストア
 *
 * Redis セッションストアの実装を提供します。
 * インメモリ実装もテスト・開発用に提供します。
 */

import { randomUUID } from 'crypto';
import type { Result } from '../../shared/result.js';
import { ok, err } from '../../shared/result.js';
import type { SessionId, SessionData, SessionStoreConfig, AuthError } from './types.js';
import { DEFAULT_SESSION_KEY_PREFIX } from './types.js';

// ============================================
// セッションID生成
// ============================================

/**
 * 新しいセッションIDを生成
 * @returns SessionId
 */
export function createSessionId(): SessionId {
  return randomUUID() as SessionId;
}

// ============================================
// セッションストアインターフェース
// ============================================

/** SessionStore インターフェース */
export interface SessionStore {
  /**
   * セッションデータを保存
   * @param sessionId - セッションID
   * @param data - セッションデータ
   * @returns 成功またはエラー
   */
  set(sessionId: SessionId, data: SessionData): Promise<Result<void, AuthError>>;

  /**
   * セッションデータを取得
   * @param sessionId - セッションID
   * @returns セッションデータ（存在しない場合はnull）またはエラー
   */
  get(sessionId: SessionId): Promise<Result<SessionData | null, AuthError>>;

  /**
   * セッションを削除
   * @param sessionId - セッションID
   * @returns 成功またはエラー
   */
  delete(sessionId: SessionId): Promise<Result<void, AuthError>>;

  /**
   * セッションが存在するか確認
   * @param sessionId - セッションID
   * @returns 存在するかどうか
   */
  exists(sessionId: SessionId): Promise<Result<boolean, AuthError>>;

  /**
   * セッションの有効期限を延長
   * @param sessionId - セッションID
   * @param newExpiresAt - 新しい有効期限
   * @returns 成功またはエラー
   */
  refresh(sessionId: SessionId, newExpiresAt: Date): Promise<Result<void, AuthError>>;

  /**
   * ストアをクローズ
   */
  close(): Promise<void>;
}

// ============================================
// インメモリ実装（テスト・開発用）
// ============================================

/** インメモリ用設定 */
export interface InMemorySessionStoreConfig {
  readonly sessionTtlSeconds?: number;
}

/**
 * インメモリセッションストアを作成
 * @param config - 設定
 * @returns SessionStore
 */
export function createInMemorySessionStore(_config: InMemorySessionStoreConfig = {}): SessionStore {
  // セッションデータを保存するMap
  const sessions = new Map<string, SessionData>();

  return {
    async set(sessionId: SessionId, data: SessionData): Promise<Result<void, AuthError>> {
      try {
        sessions.set(sessionId, data);
        return await Promise.resolve(ok(undefined));
      } catch (error) {
        return err({
          type: 'STORE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    async get(sessionId: SessionId): Promise<Result<SessionData | null, AuthError>> {
      try {
        const data = sessions.get(sessionId);
        if (data === undefined) {
          return await Promise.resolve(ok(null));
        }

        // 有効期限チェック
        if (data.expiresAt.getTime() < Date.now()) {
          // 期限切れの場合は削除してnullを返す
          sessions.delete(sessionId);
          return await Promise.resolve(ok(null));
        }

        return await Promise.resolve(ok(data));
      } catch (error) {
        return err({
          type: 'STORE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    async delete(sessionId: SessionId): Promise<Result<void, AuthError>> {
      try {
        sessions.delete(sessionId);
        return await Promise.resolve(ok(undefined));
      } catch (error) {
        return err({
          type: 'STORE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    async exists(sessionId: SessionId): Promise<Result<boolean, AuthError>> {
      try {
        const data = sessions.get(sessionId);
        if (data === undefined) {
          return await Promise.resolve(ok(false));
        }

        // 有効期限チェック
        if (data.expiresAt.getTime() < Date.now()) {
          sessions.delete(sessionId);
          return await Promise.resolve(ok(false));
        }

        return await Promise.resolve(ok(true));
      } catch (error) {
        return err({
          type: 'STORE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    async refresh(sessionId: SessionId, newExpiresAt: Date): Promise<Result<void, AuthError>> {
      try {
        const data = sessions.get(sessionId);
        if (data === undefined) {
          return await Promise.resolve(
            err({
              type: 'SESSION_NOT_FOUND',
              sessionId,
            })
          );
        }

        // 有効期限を更新した新しいセッションデータを保存
        const updatedData: SessionData = {
          ...data,
          expiresAt: newExpiresAt,
        };
        sessions.set(sessionId, updatedData);

        return await Promise.resolve(ok(undefined));
      } catch (error) {
        return err({
          type: 'STORE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    async close(): Promise<void> {
      sessions.clear();
      await Promise.resolve();
    },
  };
}

// ============================================
// Redis 実装
// ============================================

/**
 * Redis セッションストアを作成
 * @param config - セッションストア設定
 * @returns SessionStore
 */
export function createRedisSessionStore(config: SessionStoreConfig): SessionStore {
  const { redisUrl, keyPrefix = DEFAULT_SESSION_KEY_PREFIX } = config;

  // 動的インポートを使用してioredisを遅延ロード
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  let redisClient: import('ioredis').Redis | null = null;

  const getClient = async (): Promise<import('ioredis').Redis> => {
    if (redisClient === null) {
      const { Redis } = await import('ioredis');
      redisClient = new Redis(redisUrl);
    }
    return redisClient;
  };

  const getKey = (sessionId: SessionId): string => `${keyPrefix}${sessionId}`;

  const serializeSessionData = (data: SessionData): string => {
    return JSON.stringify({
      userId: data.userId,
      role: data.role,
      createdAt: data.createdAt.toISOString(),
      expiresAt: data.expiresAt.toISOString(),
    });
  };

  const deserializeSessionData = (json: string): SessionData => {
    const parsed = JSON.parse(json) as {
      userId: string;
      role: string;
      createdAt: string;
      expiresAt: string;
    };
    return {
      userId: parsed.userId as import('../../shared/branded-types.js').UserId,
      role: parsed.role as import('./types.js').UserRole,
      createdAt: new Date(parsed.createdAt),
      expiresAt: new Date(parsed.expiresAt),
    };
  };

  return {
    async set(sessionId: SessionId, data: SessionData): Promise<Result<void, AuthError>> {
      try {
        const client = await getClient();
        const key = getKey(sessionId);
        const value = serializeSessionData(data);

        // TTLを計算（秒単位）
        const ttl = Math.max(1, Math.floor((data.expiresAt.getTime() - Date.now()) / 1000));

        await client.setex(key, ttl, value);
        return ok(undefined);
      } catch (error) {
        return err({
          type: 'STORE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    async get(sessionId: SessionId): Promise<Result<SessionData | null, AuthError>> {
      try {
        const client = await getClient();
        const key = getKey(sessionId);
        const value = await client.get(key);

        if (value === null) {
          return ok(null);
        }

        const data = deserializeSessionData(value);

        // 有効期限チェック（Redisが自動削除するが念のため）
        if (data.expiresAt.getTime() < Date.now()) {
          await client.del(key);
          return ok(null);
        }

        return ok(data);
      } catch (error) {
        return err({
          type: 'STORE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    async delete(sessionId: SessionId): Promise<Result<void, AuthError>> {
      try {
        const client = await getClient();
        const key = getKey(sessionId);
        await client.del(key);
        return ok(undefined);
      } catch (error) {
        return err({
          type: 'STORE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    async exists(sessionId: SessionId): Promise<Result<boolean, AuthError>> {
      try {
        const client = await getClient();
        const key = getKey(sessionId);
        const result = await client.exists(key);
        return ok(result === 1);
      } catch (error) {
        return err({
          type: 'STORE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    async refresh(sessionId: SessionId, newExpiresAt: Date): Promise<Result<void, AuthError>> {
      try {
        const client = await getClient();
        const key = getKey(sessionId);
        const value = await client.get(key);

        if (value === null) {
          return err({
            type: 'SESSION_NOT_FOUND',
            sessionId,
          });
        }

        const data = deserializeSessionData(value);
        const updatedData: SessionData = {
          ...data,
          expiresAt: newExpiresAt,
        };

        const ttl = Math.max(1, Math.floor((newExpiresAt.getTime() - Date.now()) / 1000));

        await client.setex(key, ttl, serializeSessionData(updatedData));
        return ok(undefined);
      } catch (error) {
        return err({
          type: 'STORE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    async close(): Promise<void> {
      if (redisClient !== null) {
        await redisClient.quit();
        redisClient = null;
      }
    },
  };
}
