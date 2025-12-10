/**
 * AuthService - 認証サービスのテスト
 *
 * ログイン・ログアウト機能をテストします。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { AuthService } from './auth-service.js';
import { createAuthService } from './auth-service.js';
import { createInMemorySessionStore, type SessionStore } from './session-store.js';
import { isOk, isErr } from '../../shared/result.js';
import type { LoginInput, UserRole, SessionId } from './types.js';

// ============================================
// モックユーザーリポジトリ
// ============================================

interface MockUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

function createMockUserAuthRepository(users: MockUser[] = []): {
  findByEmail: (email: string) => Promise<MockUser | null>;
  validatePassword: (password: string, hash: string) => Promise<boolean>;
} {
  return {
    findByEmail(email: string): Promise<MockUser | null> {
      return Promise.resolve(users.find((u) => u.email === email) ?? null);
    },
    validatePassword(password: string, hash: string): Promise<boolean> {
      // シンプルなテスト用: パスワードがハッシュに一致するかチェック
      return Promise.resolve(password === hash);
    },
  };
}

describe('AuthService', () => {
  let authService: AuthService;
  let sessionStore: SessionStore;
  const testUsers: MockUser[] = [
    {
      id: 'user-1',
      name: '山田太郎',
      email: 'yamada@example.com',
      passwordHash: 'password123',
      role: 'librarian',
    },
    {
      id: 'user-2',
      name: '佐藤花子',
      email: 'sato@example.com',
      passwordHash: 'secret456',
      role: 'patron',
    },
    {
      id: 'admin-1',
      name: '管理者',
      email: 'admin@example.com',
      passwordHash: 'adminpass',
      role: 'admin',
    },
  ];

  beforeEach(() => {
    sessionStore = createInMemorySessionStore({
      sessionTtlSeconds: 3600,
    });
    const userAuthRepository = createMockUserAuthRepository(testUsers);
    authService = createAuthService({
      sessionStore,
      userAuthRepository,
      sessionTtlSeconds: 3600,
    });
  });

  describe('login', () => {
    it('正しい認証情報でログインできる', async () => {
      const input: LoginInput = {
        email: 'yamada@example.com',
        password: 'password123',
      };

      const result = await authService.login(input);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.user.email).toBe('yamada@example.com');
        expect(result.value.user.name).toBe('山田太郎');
        expect(result.value.user.role).toBe('librarian');
        expect(result.value.session.id).toBeDefined();
        expect(result.value.session.data.userId).toBe('user-1');
      }
    });

    it('セッションがストアに保存される', async () => {
      const input: LoginInput = {
        email: 'yamada@example.com',
        password: 'password123',
      };

      const loginResult = await authService.login(input);
      expect(isOk(loginResult)).toBe(true);

      if (isOk(loginResult)) {
        const sessionId = loginResult.value.session.id;
        const existsResult = await sessionStore.exists(sessionId);
        expect(isOk(existsResult)).toBe(true);
        if (isOk(existsResult)) {
          expect(existsResult.value).toBe(true);
        }
      }
    });

    it('存在しないメールアドレスはエラーを返す', async () => {
      const input: LoginInput = {
        email: 'unknown@example.com',
        password: 'password123',
      };

      const result = await authService.login(input);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe('INVALID_CREDENTIALS');
      }
    });

    it('誤ったパスワードはエラーを返す', async () => {
      const input: LoginInput = {
        email: 'yamada@example.com',
        password: 'wrongpassword',
      };

      const result = await authService.login(input);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe('INVALID_CREDENTIALS');
      }
    });

    it('管理者ユーザーでログインできる', async () => {
      const input: LoginInput = {
        email: 'admin@example.com',
        password: 'adminpass',
      };

      const result = await authService.login(input);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.user.role).toBe('admin');
      }
    });

    it('利用者ユーザーでログインできる', async () => {
      const input: LoginInput = {
        email: 'sato@example.com',
        password: 'secret456',
      };

      const result = await authService.login(input);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.user.role).toBe('patron');
      }
    });
  });

  describe('logout', () => {
    it('ログアウトでセッションが削除される', async () => {
      // まずログイン
      const loginResult = await authService.login({
        email: 'yamada@example.com',
        password: 'password123',
      });
      expect(isOk(loginResult)).toBe(true);

      if (isOk(loginResult)) {
        const sessionId = loginResult.value.session.id;

        // ログアウト
        const logoutResult = await authService.logout(sessionId);
        expect(isOk(logoutResult)).toBe(true);

        // セッションが削除されていることを確認
        const existsResult = await sessionStore.exists(sessionId);
        expect(isOk(existsResult)).toBe(true);
        if (isOk(existsResult)) {
          expect(existsResult.value).toBe(false);
        }
      }
    });

    it('存在しないセッションのログアウトも成功する', async () => {
      const fakeSessionId = 'non-existent-session' as SessionId;
      const result = await authService.logout(fakeSessionId);

      expect(isOk(result)).toBe(true);
    });
  });

  describe('validateSession', () => {
    it('有効なセッションを検証できる', async () => {
      const loginResult = await authService.login({
        email: 'yamada@example.com',
        password: 'password123',
      });
      expect(isOk(loginResult)).toBe(true);

      if (isOk(loginResult)) {
        const sessionId = loginResult.value.session.id;
        const validateResult = await authService.validateSession(sessionId);

        expect(isOk(validateResult)).toBe(true);
        if (isOk(validateResult)) {
          expect(validateResult.value).not.toBeNull();
          expect(validateResult.value?.userId).toBe('user-1');
          expect(validateResult.value?.role).toBe('librarian');
        }
      }
    });

    it('存在しないセッションはnullを返す', async () => {
      const fakeSessionId = 'non-existent-session' as SessionId;
      const result = await authService.validateSession(fakeSessionId);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBeNull();
      }
    });
  });

  describe('refreshSession', () => {
    it('セッションの有効期限を延長できる', async () => {
      const loginResult = await authService.login({
        email: 'yamada@example.com',
        password: 'password123',
      });
      expect(isOk(loginResult)).toBe(true);

      if (isOk(loginResult)) {
        const sessionId = loginResult.value.session.id;
        const originalExpiresAt = loginResult.value.session.data.expiresAt;

        // 少し待ってから更新
        await new Promise((resolve) => setTimeout(resolve, 10));

        const refreshResult = await authService.refreshSession(sessionId);
        expect(isOk(refreshResult)).toBe(true);

        if (isOk(refreshResult)) {
          expect(refreshResult.value.expiresAt.getTime()).toBeGreaterThan(
            originalExpiresAt.getTime()
          );
        }
      }
    });

    it('存在しないセッションの更新はエラーを返す', async () => {
      const fakeSessionId = 'non-existent-session' as SessionId;
      const result = await authService.refreshSession(fakeSessionId);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe('SESSION_NOT_FOUND');
      }
    });
  });
});
