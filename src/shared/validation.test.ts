import { describe, it, expect } from 'vitest';
import {
  validateISBN,
  validateRequired,
  ValidationError,
} from './validation.js';

describe('Validation Utilities', () => {
  describe('validateISBN', () => {
    describe('ISBN-10', () => {
      it('should accept valid ISBN-10 with hyphens', () => {
        const result = validateISBN('0-306-40615-2');
        expect(result.success).toBe(true);
      });

      it('should accept valid ISBN-10 without hyphens', () => {
        const result = validateISBN('0306406152');
        expect(result.success).toBe(true);
      });

      it('should accept valid ISBN-10 ending with X', () => {
        const result = validateISBN('0-8044-2957-X');
        expect(result.success).toBe(true);
      });

      it('should reject invalid ISBN-10', () => {
        const result = validateISBN('0-306-40615-0');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.type).toBe('INVALID_ISBN');
        }
      });
    });

    describe('ISBN-13', () => {
      it('should accept valid ISBN-13 with hyphens', () => {
        const result = validateISBN('978-0-306-40615-7');
        expect(result.success).toBe(true);
      });

      it('should accept valid ISBN-13 without hyphens', () => {
        const result = validateISBN('9780306406157');
        expect(result.success).toBe(true);
      });

      it('should reject invalid ISBN-13', () => {
        const result = validateISBN('978-0-306-40615-0');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.type).toBe('INVALID_ISBN');
        }
      });
    });

    describe('Invalid formats', () => {
      it('should reject empty string', () => {
        const result = validateISBN('');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.type).toBe('INVALID_ISBN');
        }
      });

      it('should reject non-numeric characters', () => {
        const result = validateISBN('ABCD-EFGH-IJKL');
        expect(result.success).toBe(false);
      });

      it('should reject wrong length', () => {
        const result = validateISBN('123456');
        expect(result.success).toBe(false);
      });
    });
  });

  describe('validateRequired', () => {
    it('should accept non-empty string', () => {
      const result = validateRequired('Hello', 'title');
      expect(result.success).toBe(true);
    });

    it('should accept string with whitespace', () => {
      const result = validateRequired('  Hello  ', 'title');
      expect(result.success).toBe(true);
    });

    it('should reject empty string', () => {
      const result = validateRequired('', 'title');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toEqual({
          type: 'REQUIRED_FIELD_MISSING',
          field: 'title',
          message: 'title is required',
        });
      }
    });

    it('should reject whitespace-only string', () => {
      const result = validateRequired('   ', 'title');
      expect(result.success).toBe(false);
      if (!result.success && result.error.type === 'REQUIRED_FIELD_MISSING') {
        expect(result.error.field).toBe('title');
      }
    });

    it('should reject null value', () => {
      const result = validateRequired(null, 'author');
      expect(result.success).toBe(false);
      if (!result.success && result.error.type === 'REQUIRED_FIELD_MISSING') {
        expect(result.error.field).toBe('author');
      }
    });

    it('should reject undefined value', () => {
      const result = validateRequired(undefined, 'isbn');
      expect(result.success).toBe(false);
      if (!result.success && result.error.type === 'REQUIRED_FIELD_MISSING') {
        expect(result.error.field).toBe('isbn');
      }
    });
  });
});
