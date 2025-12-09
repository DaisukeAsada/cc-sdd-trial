import { describe, it, expect } from 'vitest';
import {
  Result,
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
  map,
  mapErr,
  flatMap,
} from './result.js';

describe('Result Pattern', () => {
  describe('ok', () => {
    it('should create a success result', () => {
      const result = ok(42);
      expect(result).toEqual({ success: true, value: 42 });
    });

    it('should work with complex types', () => {
      const result = ok({ name: 'Test', id: 1 });
      expect(result).toEqual({ success: true, value: { name: 'Test', id: 1 } });
    });
  });

  describe('err', () => {
    it('should create an error result', () => {
      const result = err('Something went wrong');
      expect(result).toEqual({ success: false, error: 'Something went wrong' });
    });

    it('should work with error objects', () => {
      const error = { type: 'VALIDATION_ERROR', message: 'Invalid input' };
      const result = err(error);
      expect(result).toEqual({ success: false, error });
    });
  });

  describe('isOk', () => {
    it('should return true for success result', () => {
      const result = ok('value');
      expect(isOk(result)).toBe(true);
    });

    it('should return false for error result', () => {
      const result = err('error');
      expect(isOk(result)).toBe(false);
    });
  });

  describe('isErr', () => {
    it('should return false for success result', () => {
      const result = ok('value');
      expect(isErr(result)).toBe(false);
    });

    it('should return true for error result', () => {
      const result = err('error');
      expect(isErr(result)).toBe(true);
    });
  });

  describe('unwrap', () => {
    it('should return value for success result', () => {
      const result = ok(42);
      expect(unwrap(result)).toBe(42);
    });

    it('should throw for error result', () => {
      const result = err('error');
      expect(() => unwrap(result)).toThrow('Cannot unwrap an error result');
    });
  });

  describe('unwrapOr', () => {
    it('should return value for success result', () => {
      const result = ok(42);
      expect(unwrapOr(result, 0)).toBe(42);
    });

    it('should return default value for error result', () => {
      const result = err('error');
      expect(unwrapOr(result, 0)).toBe(0);
    });
  });

  describe('map', () => {
    it('should transform value for success result', () => {
      const result = ok(21);
      const mapped = map(result, (x: number) => x * 2);
      expect(mapped).toEqual({ success: true, value: 42 });
    });

    it('should not transform error result', () => {
      const result = err<number, string>('error');
      const mapped = map(result, (x: number) => x * 2);
      expect(mapped).toEqual({ success: false, error: 'error' });
    });
  });

  describe('mapErr', () => {
    it('should not transform success result', () => {
      const result = ok<number, string>(42);
      const mapped = mapErr(result, (e: string) => `Error: ${e}`);
      expect(mapped).toEqual({ success: true, value: 42 });
    });

    it('should transform error for error result', () => {
      const result = err('original');
      const mapped = mapErr(result, (e: string) => `Error: ${e}`);
      expect(mapped).toEqual({ success: false, error: 'Error: original' });
    });
  });

  describe('flatMap', () => {
    it('should chain operations for success result', () => {
      const result = ok(21);
      const chained = flatMap(result, (x: number) => ok(x * 2));
      expect(chained).toEqual({ success: true, value: 42 });
    });

    it('should propagate error in first result', () => {
      const result = err<number, string>('first error');
      const chained = flatMap(result, (x: number) => ok(x * 2));
      expect(chained).toEqual({ success: false, error: 'first error' });
    });

    it('should propagate error from chained operation', () => {
      const result = ok(10);
      const chained = flatMap(result, (x: number) =>
        x > 5 ? err('too big') : ok(x * 2)
      );
      expect(chained).toEqual({ success: false, error: 'too big' });
    });
  });
});
