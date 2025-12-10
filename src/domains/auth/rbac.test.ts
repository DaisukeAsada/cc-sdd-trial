/**
 * RBAC (Role-Based Access Control) - テスト
 *
 * ロールベースアクセス制御のテストを提供します。
 */

import { describe, it, expect } from 'vitest';
import type { Response, NextFunction } from 'express';
import type { UserRole, SessionData } from './types.js';
import {
  createRoleGuard,
  requireAuth,
  requireLibrarian,
  requireAdmin,
  requirePatron,
  hasRole,
  canAccessEndpoint,
  type RoleConfig,
  type AuthenticatedRequest,
} from './rbac.js';
import type { UserId } from '../../shared/branded-types.js';

// ============================================
// テストヘルパー
// ============================================

function createMockRequest(sessionData?: SessionData): AuthenticatedRequest {
  const baseRequest = {
    headers: {},
  } as AuthenticatedRequest;

  if (sessionData !== undefined) {
    baseRequest.session = sessionData;
  }

  return baseRequest;
}

function createMockResponse(): Partial<Response> & { statusCode: number; body: unknown } {
  const res: Partial<Response> & { statusCode: number; body: unknown } = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      res.statusCode = code;
      return res as Response;
    },
    json(data: unknown) {
      res.body = data;
      return res as Response;
    },
  };
  return res;
}

function createMockNext(): { fn: NextFunction; called: boolean } {
  const state = { called: false };
  return {
    fn: ((): void => {
      state.called = true;
    }) as NextFunction,
    get called(): boolean {
      return state.called;
    },
  };
}

function createSessionData(role: UserRole): SessionData {
  return {
    userId: 'test-user-id' as UserId,
    role,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 3600 * 1000),
  };
}

// ============================================
// hasRole 関数のテスト
// ============================================

describe('hasRole', () => {
  it('should return true when user has the required role', () => {
    expect(hasRole('admin', ['admin'])).toBe(true);
    expect(hasRole('librarian', ['librarian'])).toBe(true);
    expect(hasRole('patron', ['patron'])).toBe(true);
  });

  it('should return true when user role is in allowed roles list', () => {
    expect(hasRole('admin', ['admin', 'librarian'])).toBe(true);
    expect(hasRole('librarian', ['admin', 'librarian'])).toBe(true);
  });

  it('should return false when user role is not in allowed roles list', () => {
    expect(hasRole('patron', ['admin', 'librarian'])).toBe(false);
    expect(hasRole('librarian', ['admin'])).toBe(false);
  });

  it('should return false when allowed roles is empty', () => {
    expect(hasRole('admin', [])).toBe(false);
  });
});

// ============================================
// canAccessEndpoint 関数のテスト
// ============================================

describe('canAccessEndpoint', () => {
  const config: RoleConfig = {
    '/api/books': {
      GET: ['librarian', 'patron', 'admin'],
      POST: ['librarian', 'admin'],
      PUT: ['librarian', 'admin'],
      DELETE: ['admin'],
    },
    '/api/users': {
      GET: ['librarian', 'admin'],
      POST: ['librarian', 'admin'],
    },
    '/api/reports': {
      GET: ['admin'],
    },
  };

  it('should return true when role has access to endpoint', () => {
    expect(canAccessEndpoint('/api/books', 'GET', 'patron', config)).toBe(true);
    expect(canAccessEndpoint('/api/books', 'POST', 'librarian', config)).toBe(true);
    expect(canAccessEndpoint('/api/books', 'DELETE', 'admin', config)).toBe(true);
  });

  it('should return false when role does not have access to endpoint', () => {
    expect(canAccessEndpoint('/api/books', 'POST', 'patron', config)).toBe(false);
    expect(canAccessEndpoint('/api/books', 'DELETE', 'librarian', config)).toBe(false);
    expect(canAccessEndpoint('/api/reports', 'GET', 'patron', config)).toBe(false);
  });

  it('should return false for unconfigured endpoints', () => {
    expect(canAccessEndpoint('/api/unknown', 'GET', 'admin', config)).toBe(false);
  });

  it('should return false for unconfigured methods', () => {
    expect(canAccessEndpoint('/api/reports', 'POST', 'admin', config)).toBe(false);
  });
});

// ============================================
// createRoleGuard ミドルウェアのテスト
// ============================================

describe('createRoleGuard', () => {
  it('should call next() when user has required role', () => {
    const guard = createRoleGuard(['librarian', 'admin']);
    const req = createMockRequest(createSessionData('librarian'));
    const res = createMockResponse();
    const next = createMockNext();

    guard(req, res as Response, next.fn);

    expect(next.called).toBe(true);
    expect(res.statusCode).toBe(200);
  });

  it('should return 401 when session is not present', () => {
    const guard = createRoleGuard(['librarian']);
    const req = createMockRequest(undefined);
    const res = createMockResponse();
    const next = createMockNext();

    guard(req, res as Response, next.fn);

    expect(next.called).toBe(false);
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      error: {
        type: 'UNAUTHORIZED',
        message: '認証が必要です',
      },
    });
  });

  it('should return 403 when user does not have required role', () => {
    const guard = createRoleGuard(['admin']);
    const req = createMockRequest(createSessionData('patron'));
    const res = createMockResponse();
    const next = createMockNext();

    guard(req, res as Response, next.fn);

    expect(next.called).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      error: {
        type: 'FORBIDDEN',
        message: 'この操作を実行する権限がありません',
        requiredRoles: ['admin'],
        userRole: 'patron',
      },
    });
  });

  it('should allow admin to access librarian endpoints', () => {
    const guard = createRoleGuard(['librarian']);
    const req = createMockRequest(createSessionData('admin'));
    const res = createMockResponse();
    const next = createMockNext();

    guard(req, res as Response, next.fn);

    expect(next.called).toBe(true);
  });
});

// ============================================
// requireAuth ミドルウェアのテスト
// ============================================

describe('requireAuth', () => {
  it('should call next() when session is present', () => {
    const req = createMockRequest(createSessionData('patron'));
    const res = createMockResponse();
    const next = createMockNext();

    requireAuth(req, res as Response, next.fn);

    expect(next.called).toBe(true);
  });

  it('should return 401 when session is not present', () => {
    const req = createMockRequest(undefined);
    const res = createMockResponse();
    const next = createMockNext();

    requireAuth(req, res as Response, next.fn);

    expect(next.called).toBe(false);
    expect(res.statusCode).toBe(401);
  });
});

// ============================================
// 役割別ミドルウェアのテスト
// ============================================

describe('requireLibrarian', () => {
  it('should allow librarian', () => {
    const req = createMockRequest(createSessionData('librarian'));
    const res = createMockResponse();
    const next = createMockNext();

    requireLibrarian(req, res as Response, next.fn);

    expect(next.called).toBe(true);
  });

  it('should allow admin', () => {
    const req = createMockRequest(createSessionData('admin'));
    const res = createMockResponse();
    const next = createMockNext();

    requireLibrarian(req, res as Response, next.fn);

    expect(next.called).toBe(true);
  });

  it('should deny patron', () => {
    const req = createMockRequest(createSessionData('patron'));
    const res = createMockResponse();
    const next = createMockNext();

    requireLibrarian(req, res as Response, next.fn);

    expect(next.called).toBe(false);
    expect(res.statusCode).toBe(403);
  });
});

describe('requireAdmin', () => {
  it('should allow admin', () => {
    const req = createMockRequest(createSessionData('admin'));
    const res = createMockResponse();
    const next = createMockNext();

    requireAdmin(req, res as Response, next.fn);

    expect(next.called).toBe(true);
  });

  it('should deny librarian', () => {
    const req = createMockRequest(createSessionData('librarian'));
    const res = createMockResponse();
    const next = createMockNext();

    requireAdmin(req, res as Response, next.fn);

    expect(next.called).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  it('should deny patron', () => {
    const req = createMockRequest(createSessionData('patron'));
    const res = createMockResponse();
    const next = createMockNext();

    requireAdmin(req, res as Response, next.fn);

    expect(next.called).toBe(false);
    expect(res.statusCode).toBe(403);
  });
});

describe('requirePatron', () => {
  it('should allow patron', () => {
    const req = createMockRequest(createSessionData('patron'));
    const res = createMockResponse();
    const next = createMockNext();

    requirePatron(req, res as Response, next.fn);

    expect(next.called).toBe(true);
  });

  it('should allow librarian', () => {
    const req = createMockRequest(createSessionData('librarian'));
    const res = createMockResponse();
    const next = createMockNext();

    requirePatron(req, res as Response, next.fn);

    expect(next.called).toBe(true);
  });

  it('should allow admin', () => {
    const req = createMockRequest(createSessionData('admin'));
    const res = createMockResponse();
    const next = createMockNext();

    requirePatron(req, res as Response, next.fn);

    expect(next.called).toBe(true);
  });
});
