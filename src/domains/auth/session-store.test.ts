/**
 * SessionStore - セッションストアのテスト
 *
 * Redis セッションストアの機能をテストします。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { SessionStore } from './session-store.js';
import { createInMemorySessionStore, createSessionId } from './session-store.js';
import { createUserId } from '../../shared/branded-types.js';
import { isOk, isErr } from '../../shared/result.js';
import type { SessionData, UserRole } from './types.js';

describe('SessionStore', () => {
  let store: SessionStore;

  beforeEach(() => {
    store = createInMemorySessionStore({
      sessionTtlSeconds: 3600, // 1時間
    });
  });

  describe('createSessionId', () => {
    it('一意なセッションIDを生成する', () => {
      const id1 = createSessionId();
      const id2 = createSessionId();

      expect(id1).not.toBe(id2);
      expect(id1.length).toBeGreaterThan(0);
      expect(id2.length).toBeGreaterThan(0);
    });
  });

  describe('set', () => {
    it('セッションデータを保存できる', async () => {
      const sessionId = createSessionId();
      const userId = createUserId('user-123');
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 3600 * 1000);

      const sessionData: SessionData = {
        userId,
        role: 'librarian' as UserRole,
        createdAt: now,
        expiresAt,
      };

      const result = await store.set(sessionId, sessionData);

      expect(isOk(result)).toBe(true);
    });

    it('同じセッションIDで上書きできる', async () => {
      const sessionId = createSessionId();
      const userId = createUserId('user-123');
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 3600 * 1000);

      const sessionData1: SessionData = {
        userId,
        role: 'patron' as UserRole,
        createdAt: now,
        expiresAt,
      };

      const sessionData2: SessionData = {
        userId,
        role: 'librarian' as UserRole,
        createdAt: now,
        expiresAt,
      };

      await store.set(sessionId, sessionData1);
      const result = await store.set(sessionId, sessionData2);

      expect(isOk(result)).toBe(true);

      const getResult = await store.get(sessionId);
      expect(isOk(getResult)).toBe(true);
      if (isOk(getResult)) {
        expect(getResult.value?.role).toBe('librarian');
      }
    });
  });

  describe('get', () => {
    it('存在するセッションを取得できる', async () => {
      const sessionId = createSessionId();
      const userId = createUserId('user-456');
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 3600 * 1000);

      const sessionData: SessionData = {
        userId,
        role: 'admin' as UserRole,
        createdAt: now,
        expiresAt,
      };

      await store.set(sessionId, sessionData);
      const result = await store.get(sessionId);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).not.toBeNull();
        expect(result.value?.userId).toBe(userId);
        expect(result.value?.role).toBe('admin');
      }
    });

    it('存在しないセッションはnullを返す', async () => {
      const sessionId = createSessionId();
      const result = await store.get(sessionId);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBeNull();
      }
    });
  });

  describe('delete', () => {
    it('セッションを削除できる', async () => {
      const sessionId = createSessionId();
      const userId = createUserId('user-789');
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 3600 * 1000);

      const sessionData: SessionData = {
        userId,
        role: 'patron' as UserRole,
        createdAt: now,
        expiresAt,
      };

      await store.set(sessionId, sessionData);
      const deleteResult = await store.delete(sessionId);

      expect(isOk(deleteResult)).toBe(true);

      const getResult = await store.get(sessionId);
      expect(isOk(getResult)).toBe(true);
      if (isOk(getResult)) {
        expect(getResult.value).toBeNull();
      }
    });

    it('存在しないセッションの削除も成功する', async () => {
      const sessionId = createSessionId();
      const result = await store.delete(sessionId);

      expect(isOk(result)).toBe(true);
    });
  });

  describe('exists', () => {
    it('存在するセッションはtrueを返す', async () => {
      const sessionId = createSessionId();
      const userId = createUserId('user-exists');
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 3600 * 1000);

      const sessionData: SessionData = {
        userId,
        role: 'librarian' as UserRole,
        createdAt: now,
        expiresAt,
      };

      await store.set(sessionId, sessionData);
      const result = await store.exists(sessionId);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(true);
      }
    });

    it('存在しないセッションはfalseを返す', async () => {
      const sessionId = createSessionId();
      const result = await store.exists(sessionId);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(false);
      }
    });
  });

  describe('refresh', () => {
    it('セッションの有効期限を延長できる', async () => {
      const sessionId = createSessionId();
      const userId = createUserId('user-refresh');
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 3600 * 1000);

      const sessionData: SessionData = {
        userId,
        role: 'patron' as UserRole,
        createdAt: now,
        expiresAt,
      };

      await store.set(sessionId, sessionData);

      const newExpiresAt = new Date(now.getTime() + 7200 * 1000); // 2時間後
      const result = await store.refresh(sessionId, newExpiresAt);

      expect(isOk(result)).toBe(true);

      const getResult = await store.get(sessionId);
      expect(isOk(getResult)).toBe(true);
      if (isOk(getResult) && getResult.value !== null) {
        expect(getResult.value.expiresAt.getTime()).toBe(newExpiresAt.getTime());
      }
    });

    it('存在しないセッションの更新はエラーを返す', async () => {
      const sessionId = createSessionId();
      const newExpiresAt = new Date(Date.now() + 7200 * 1000);

      const result = await store.refresh(sessionId, newExpiresAt);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe('SESSION_NOT_FOUND');
      }
    });
  });
});
