/**
 * Security Utilities Tests
 *
 * APIセキュリティ対策のテスト
 * - 入力サニタイズ
 * - セキュリティヘッダー設定
 * - 入力バリデーションミドルウェア
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeString,
  sanitizeObject,
  validateUUID,
  validatePositiveInteger,
  validateStringLength,
} from './security.js';

describe('Security Utilities', () => {
  describe('sanitizeString', () => {
    it('should trim whitespace from strings', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should remove null bytes', () => {
      expect(sanitizeString('hello\x00world')).toBe('helloworld');
    });

    it('should handle empty strings', () => {
      expect(sanitizeString('')).toBe('');
    });

    it('should handle null and undefined', () => {
      expect(sanitizeString(null)).toBeNull();
      expect(sanitizeString(undefined)).toBeUndefined();
    });

    it('should escape HTML special characters when escapeHtml is true', () => {
      expect(sanitizeString('<script>alert("xss")</script>', { escapeHtml: true })).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    it('should not escape HTML by default', () => {
      expect(sanitizeString('<p>hello</p>')).toBe('<p>hello</p>');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize all string values in object', () => {
      const input = {
        name: '  John  ',
        email: ' john@example.com ',
        age: 30,
      };
      const result = sanitizeObject(input);
      expect(result.name).toBe('John');
      expect(result.email).toBe('john@example.com');
      expect(result.age).toBe(30);
    });

    it('should handle nested objects', () => {
      const input = {
        user: {
          name: '  Jane  ',
        },
      };
      const result = sanitizeObject(input);
      expect(result.user.name).toBe('Jane');
    });

    it('should handle null values', () => {
      const input = {
        name: null,
        email: '  test@example.com  ',
      };
      const result = sanitizeObject(input);
      expect(result.name).toBeNull();
      expect(result.email).toBe('test@example.com');
    });
  });

  describe('validateUUID', () => {
    it('should accept valid UUID v4', () => {
      const result = validateUUID('123e4567-e89b-12d3-a456-426614174000');
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = validateUUID('not-a-uuid');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('INVALID_FORMAT');
      }
    });

    it('should reject empty string', () => {
      const result = validateUUID('');
      expect(result.success).toBe(false);
    });

    it('should reject UUID with wrong format', () => {
      const result = validateUUID('123e4567e89b12d3a456426614174000'); // no dashes
      expect(result.success).toBe(false);
    });
  });

  describe('validatePositiveInteger', () => {
    it('should accept positive integers', () => {
      const result = validatePositiveInteger(42, 'age');
      expect(result.success).toBe(true);
    });

    it('should accept zero when allowZero is true', () => {
      const result = validatePositiveInteger(0, 'count', { allowZero: true });
      expect(result.success).toBe(true);
    });

    it('should reject zero by default', () => {
      const result = validatePositiveInteger(0, 'count');
      expect(result.success).toBe(false);
    });

    it('should reject negative numbers', () => {
      const result = validatePositiveInteger(-5, 'amount');
      expect(result.success).toBe(false);
    });

    it('should reject floating point numbers', () => {
      const result = validatePositiveInteger(3.14, 'value');
      expect(result.success).toBe(false);
    });

    it('should reject NaN', () => {
      const result = validatePositiveInteger(NaN, 'value');
      expect(result.success).toBe(false);
    });
  });

  describe('validateStringLength', () => {
    it('should accept string within length limits', () => {
      const result = validateStringLength('hello', 'title', { min: 1, max: 100 });
      expect(result.success).toBe(true);
    });

    it('should reject string shorter than min', () => {
      const result = validateStringLength('hi', 'title', { min: 5 });
      expect(result.success).toBe(false);
    });

    it('should reject string longer than max', () => {
      const result = validateStringLength('a'.repeat(101), 'title', { max: 100 });
      expect(result.success).toBe(false);
    });

    it('should use default limits when not specified', () => {
      // Default max should be reasonable (e.g., 1000)
      const result = validateStringLength('hello', 'title');
      expect(result.success).toBe(true);
    });
  });
});
