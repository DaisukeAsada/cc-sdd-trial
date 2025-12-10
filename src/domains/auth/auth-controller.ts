/**
 * AuthController - 認証コントローラー
 *
 * ログイン・ログアウトのREST APIエンドポイントを提供します。
 */

import { Router, type Request, type Response } from 'express';
import { isErr } from '../../shared/result.js';
import type { AuthService } from './auth-service.js';
import type { LoginInput, SessionId } from './types.js';

// ============================================
// Cookie パーサー
// ============================================

/**
 * Cookieヘッダーからセッションを取得
 */
function getSessionIdFromCookie(req: Request): SessionId | null {
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

  return sessionId as SessionId;
}

// ============================================
// バリデーション
// ============================================

interface ValidationResult {
  valid: boolean;
  errors: { field: string; message: string }[];
}

function validateLoginInput(body: unknown): ValidationResult {
  const errors: { field: string; message: string }[] = [];

  if (typeof body !== 'object' || body === null) {
    return { valid: false, errors: [{ field: 'body', message: 'リクエストボディが不正です' }] };
  }

  const { email, password } = body as Record<string, unknown>;

  if (typeof email !== 'string' || email.trim() === '') {
    errors.push({ field: 'email', message: 'メールアドレスは必須です' });
  }

  if (typeof password !== 'string' || password === '') {
    errors.push({ field: 'password', message: 'パスワードは必須です' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================
// コントローラー
// ============================================

/**
 * AuthControllerを作成
 * @param authService - 認証サービス
 * @returns Express Router
 */
export function createAuthController(authService: AuthService): Router {
  const router = Router();

  /**
   * POST /api/auth/login
   * ログイン処理
   */
  router.post('/login', async (req: Request, res: Response): Promise<void> => {
    // バリデーション
    const validation = validateLoginInput(req.body);
    if (!validation.valid) {
      const firstError = validation.errors[0];
      res.status(400).json({
        error: {
          type: 'VALIDATION_ERROR',
          message: firstError?.message ?? 'バリデーションエラー',
          errors: validation.errors,
        },
      });
      return;
    }

    const input: LoginInput = {
      email: (req.body as { email: string }).email.trim(),
      password: (req.body as { password: string }).password,
    };

    const result = await authService.login(input);

    if (isErr(result)) {
      res.status(401).json({
        error: result.error,
      });
      return;
    }

    const { session, user } = result.value;

    // セッションIDをCookieに設定
    const maxAge = Math.floor((session.data.expiresAt.getTime() - Date.now()) / 1000);
    res.setHeader('Set-Cookie', [
      `sessionId=${session.id}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${String(maxAge)}`,
    ]);

    res.status(200).json({
      sessionId: session.id,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      expiresAt: session.data.expiresAt.toISOString(),
    });
  });

  /**
   * POST /api/auth/logout
   * ログアウト処理
   */
  router.post('/logout', async (req: Request, res: Response): Promise<void> => {
    const sessionId = getSessionIdFromCookie(req);

    if (sessionId !== null) {
      await authService.logout(sessionId);
    }

    // セッションCookieを削除
    res.setHeader('Set-Cookie', ['sessionId=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0']);

    res.status(200).json({
      success: true,
    });
  });

  /**
   * GET /api/auth/session
   * 現在のセッション情報を取得
   */
  router.get('/session', async (req: Request, res: Response): Promise<void> => {
    const sessionId = getSessionIdFromCookie(req);

    if (sessionId === null) {
      res.status(401).json({
        error: {
          type: 'SESSION_NOT_FOUND',
          message: 'セッションが見つかりません',
        },
      });
      return;
    }

    const result = await authService.validateSession(sessionId);

    if (isErr(result)) {
      res.status(500).json({
        error: result.error,
      });
      return;
    }

    if (result.value === null) {
      res.status(401).json({
        error: {
          type: 'SESSION_NOT_FOUND',
          message: 'セッションが見つかりません',
          sessionId,
        },
      });
      return;
    }

    res.status(200).json({
      userId: result.value.userId,
      role: result.value.role,
      createdAt: result.value.createdAt.toISOString(),
      expiresAt: result.value.expiresAt.toISOString(),
    });
  });

  /**
   * POST /api/auth/refresh
   * セッションの有効期限を延長
   */
  router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
    const sessionId = getSessionIdFromCookie(req);

    if (sessionId === null) {
      res.status(401).json({
        error: {
          type: 'SESSION_NOT_FOUND',
          message: 'セッションが見つかりません',
        },
      });
      return;
    }

    const result = await authService.refreshSession(sessionId);

    if (isErr(result)) {
      if (result.error.type === 'SESSION_NOT_FOUND') {
        res.status(401).json({
          error: result.error,
        });
        return;
      }
      res.status(500).json({
        error: result.error,
      });
      return;
    }

    // 更新されたセッションCookieを設定
    const refreshMaxAge = Math.floor((result.value.expiresAt.getTime() - Date.now()) / 1000);
    res.setHeader('Set-Cookie', [
      `sessionId=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${String(refreshMaxAge)}`,
    ]);

    res.status(200).json({
      userId: result.value.userId,
      role: result.value.role,
      expiresAt: result.value.expiresAt.toISOString(),
    });
  });

  return router;
}
