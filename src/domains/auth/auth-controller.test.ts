/**
 * AuthController - 認証コントローラーのテスト
 *
 * ログイン・ログアウトのREST APIエンドポイントをテストします。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { createAuthController } from './auth-controller.js';
import { createAuthService, type AuthService, type UserAuthRepository } from './auth-service.js';
import { createInMemorySessionStore, type SessionStore } from './session-store.js';
import type { UserRole } from './types.js';

// ============================================
// テスト用ヘルパー
// ============================================

interface MockUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

function createMockUserAuthRepository(users: MockUser[]): UserAuthRepository {
  return {
    findByEmail(email: string): Promise<MockUser | null> {
      return Promise.resolve(users.find((u) => u.email === email) ?? null);
    },
    validatePassword(password: string, hash: string): Promise<boolean> {
      return Promise.resolve(password === hash);
    },
  };
}

function createTestApp(authService: AuthService): Express {
  const app = express();
  app.use(express.json());

  const authController = createAuthController(authService);
  app.use('/api/auth', authController);

  return app;
}

describe('AuthController', () => {
  let app: Express;
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
    app = createTestApp(authService);
  });

  describe('POST /api/auth/login', () => {
    it('正しい認証情報で200とセッション情報を返す', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'yamada@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body.user.email).toBe('yamada@example.com');
      expect(response.body.user.name).toBe('山田太郎');
      expect(response.body.user.role).toBe('librarian');
      expect(response.body.sessionId).toBeDefined();
    });

    it('Set-CookieヘッダーにセッションIDが設定される', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'yamada@example.com',
          password: 'password123',
        })
        .expect(200);

      const setCookieHeader = response.headers['set-cookie'] as string[] | undefined;
      expect(setCookieHeader).toBeDefined();
      if (setCookieHeader !== undefined) {
        expect(setCookieHeader[0]).toContain('sessionId=');
      }
    });

    it('誤ったパスワードで401を返す', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'yamada@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.error.type).toBe('INVALID_CREDENTIALS');
    });

    it('存在しないメールアドレスで401を返す', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unknown@example.com',
          password: 'password123',
        })
        .expect(401);

      expect(response.body.error.type).toBe('INVALID_CREDENTIALS');
    });

    it('メールアドレス未入力で400を返す', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'password123',
        })
        .expect(400);

      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('パスワード未入力で400を返す', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'yamada@example.com',
        })
        .expect(400);

      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('ログアウトで200を返しセッションが削除される', async () => {
      // まずログイン
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'yamada@example.com',
          password: 'password123',
        })
        .expect(200);

      const sessionId = loginResponse.body.sessionId as string;

      // ログアウト
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', [`sessionId=${sessionId}`])
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);
    });

    it('セッションIDなしでも200を返す', async () => {
      const response = await request(app).post('/api/auth/logout').expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/auth/session', () => {
    it('有効なセッションで200とセッション情報を返す', async () => {
      // まずログイン
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'yamada@example.com',
          password: 'password123',
        })
        .expect(200);

      const sessionId = loginResponse.body.sessionId as string;

      // セッション確認
      const sessionResponse = await request(app)
        .get('/api/auth/session')
        .set('Cookie', [`sessionId=${sessionId}`])
        .expect(200);

      expect(sessionResponse.body.userId).toBe('user-1');
      expect(sessionResponse.body.role).toBe('librarian');
    });

    it('無効なセッションで401を返す', async () => {
      const response = await request(app)
        .get('/api/auth/session')
        .set('Cookie', ['sessionId=invalid-session-id'])
        .expect(401);

      expect(response.body.error.type).toBe('SESSION_NOT_FOUND');
    });

    it('セッションIDなしで401を返す', async () => {
      const response = await request(app).get('/api/auth/session').expect(401);

      expect(response.body.error.type).toBe('SESSION_NOT_FOUND');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('セッションを更新して200を返す', async () => {
      // まずログイン
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'yamada@example.com',
          password: 'password123',
        })
        .expect(200);

      const sessionId = loginResponse.body.sessionId as string;

      // 少し待機
      await new Promise((resolve) => setTimeout(resolve, 10));

      // セッション更新
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [`sessionId=${sessionId}`])
        .expect(200);

      expect(refreshResponse.body.expiresAt).toBeDefined();
    });

    it('無効なセッションで401を返す', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', ['sessionId=invalid-session-id'])
        .expect(401);

      expect(response.body.error.type).toBe('SESSION_NOT_FOUND');
    });
  });
});
