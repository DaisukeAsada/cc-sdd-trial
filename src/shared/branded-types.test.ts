import { describe, it, expect } from 'vitest';
import {
  BookId,
  UserId,
  LoanId,
  ReservationId,
  CopyId,
  createBookId,
  createUserId,
  createLoanId,
  createReservationId,
  createCopyId,
} from './branded-types.js';

describe('Branded Types', () => {
  describe('BookId', () => {
    it('should create a valid BookId', () => {
      const id = createBookId('book-123');
      expect(id).toBe('book-123');
    });

    it('should throw error for empty string', () => {
      expect(() => createBookId('')).toThrow('BookId cannot be empty');
    });
  });

  describe('UserId', () => {
    it('should create a valid UserId', () => {
      const id = createUserId('user-456');
      expect(id).toBe('user-456');
    });

    it('should throw error for empty string', () => {
      expect(() => createUserId('')).toThrow('UserId cannot be empty');
    });
  });

  describe('LoanId', () => {
    it('should create a valid LoanId', () => {
      const id = createLoanId('loan-789');
      expect(id).toBe('loan-789');
    });

    it('should throw error for empty string', () => {
      expect(() => createLoanId('')).toThrow('LoanId cannot be empty');
    });
  });

  describe('ReservationId', () => {
    it('should create a valid ReservationId', () => {
      const id = createReservationId('res-101');
      expect(id).toBe('res-101');
    });

    it('should throw error for empty string', () => {
      expect(() => createReservationId('')).toThrow('ReservationId cannot be empty');
    });
  });

  describe('CopyId', () => {
    it('should create a valid CopyId', () => {
      const id = createCopyId('copy-202');
      expect(id).toBe('copy-202');
    });

    it('should throw error for empty string', () => {
      expect(() => createCopyId('')).toThrow('CopyId cannot be empty');
    });
  });

  describe('Type Safety', () => {
    it('should not allow assigning different branded types to each other (compile-time check)', () => {
      const bookId: BookId = createBookId('book-1');
      const userId: UserId = createUserId('user-1');

      // This test validates that the types exist and are distinct
      // The actual compile-time check is enforced by TypeScript
      expect(bookId).not.toBe(userId);
    });
  });
});
