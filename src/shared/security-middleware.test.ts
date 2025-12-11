/**
 * Security Middleware Tests
 *
 * セキュリティミドルウェアのテスト
 * - CSPヘッダー設定
 * - 入力サニタイズミドルウェア
 * - SQLインジェクション対策確認
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  securityHeadersMiddleware,
  sanitizeInputMiddleware,
  validateRequestParams,
  createQueryBuilder,
} from './security-middleware.js';

describe('Security Middleware', () => {
  describe('securityHeadersMiddleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockReq = {};
      mockRes = {
        setHeader: vi.fn(),
      };
      mockNext = vi.fn();
    });

    it('should set Content-Security-Policy header', () => {
      securityHeadersMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.stringContaining("default-src 'self'")
      );
    });

    it('should set X-Content-Type-Options header', () => {
      securityHeadersMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    });

    it('should set X-Frame-Options header', () => {
      securityHeadersMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    });

    it('should set X-XSS-Protection header', () => {
      securityHeadersMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
    });

    it('should set Strict-Transport-Security header', () => {
      securityHeadersMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains'
      );
    });

    it('should call next', () => {
      securityHeadersMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('sanitizeInputMiddleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockReq = {
        body: {},
        query: {},
        params: {},
      };
      mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      mockNext = vi.fn();
    });

    it('should sanitize request body strings', () => {
      mockReq.body = { name: '  John  ', email: ' test@example.com ' };

      sanitizeInputMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.name).toBe('John');
      expect(mockReq.body.email).toBe('test@example.com');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should sanitize query parameters', () => {
      mockReq.query = { search: '  keyword  ' };

      sanitizeInputMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.query.search).toBe('keyword');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should sanitize route params', () => {
      mockReq.params = { id: '  123  ' };

      sanitizeInputMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.params.id).toBe('123');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should preserve non-string values', () => {
      mockReq.body = { age: 30, active: true, count: 0 };

      sanitizeInputMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.age).toBe(30);
      expect(mockReq.body.active).toBe(true);
      expect(mockReq.body.count).toBe(0);
    });
  });

  describe('validateRequestParams', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockReq = {
        params: {},
      };
      mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      mockNext = vi.fn();
    });

    it('should pass valid UUID in params', () => {
      mockReq.params = { id: '123e4567-e89b-12d3-a456-426614174000' };
      const middleware = validateRequestParams(['id']);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject invalid UUID in params', () => {
      mockReq.params = { id: 'invalid-uuid' };
      const middleware = validateRequestParams(['id']);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            type: 'INVALID_FORMAT',
          }),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle multiple param validation', () => {
      mockReq.params = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        bookId: '987fcdeb-51a2-3c4e-b567-012345678900',
      };
      const middleware = validateRequestParams(['userId', 'bookId']);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('createQueryBuilder', () => {
    it('should create parameterized query with single condition', () => {
      const builder = createQueryBuilder('SELECT * FROM books');
      builder.where('title', '=', 'Test Book');

      const { text, values } = builder.build();

      expect(text).toBe('SELECT * FROM books WHERE title = $1');
      expect(values).toEqual(['Test Book']);
    });

    it('should create parameterized query with multiple conditions', () => {
      const builder = createQueryBuilder('SELECT * FROM books');
      builder.where('title', '=', 'Test');
      builder.andWhere('author', '=', 'John');

      const { text, values } = builder.build();

      expect(text).toBe('SELECT * FROM books WHERE title = $1 AND author = $2');
      expect(values).toEqual(['Test', 'John']);
    });

    it('should handle LIKE operator safely', () => {
      const builder = createQueryBuilder('SELECT * FROM books');
      builder.where('title', 'LIKE', '%Test%');

      const { text, values } = builder.build();

      expect(text).toBe('SELECT * FROM books WHERE title LIKE $1');
      expect(values).toEqual(['%Test%']);
    });

    it('should handle IN operator with array', () => {
      const builder = createQueryBuilder('SELECT * FROM books');
      builder.whereIn('category', ['Fiction', 'Non-Fiction']);

      const { text, values } = builder.build();

      expect(text).toBe('SELECT * FROM books WHERE category IN ($1, $2)');
      expect(values).toEqual(['Fiction', 'Non-Fiction']);
    });

    it('should handle NULL checks', () => {
      const builder = createQueryBuilder('SELECT * FROM books');
      builder.whereNull('deleted_at');

      const { text, values } = builder.build();

      expect(text).toBe('SELECT * FROM books WHERE deleted_at IS NULL');
      expect(values).toEqual([]);
    });

    it('should handle optional ORDER BY', () => {
      const builder = createQueryBuilder('SELECT * FROM books');
      builder.where('status', '=', 'AVAILABLE');
      builder.orderBy('title', 'ASC');

      const { text, values } = builder.build();

      expect(text).toBe('SELECT * FROM books WHERE status = $1 ORDER BY title ASC');
      expect(values).toEqual(['AVAILABLE']);
    });

    it('should handle LIMIT and OFFSET', () => {
      const builder = createQueryBuilder('SELECT * FROM books');
      builder.limit(10);
      builder.offset(20);

      const { text, values } = builder.build();

      expect(text).toBe('SELECT * FROM books LIMIT $1 OFFSET $2');
      expect(values).toEqual([10, 20]);
    });

    it('should prevent SQL injection in values', () => {
      const builder = createQueryBuilder('SELECT * FROM books');
      builder.where('title', '=', "'; DROP TABLE books; --");

      const { text, values } = builder.build();

      // Value should be parameterized, not interpolated
      expect(text).toBe('SELECT * FROM books WHERE title = $1');
      expect(values).toEqual(["'; DROP TABLE books; --"]);
      // The actual query execution with pg library will escape this properly
    });
  });
});
