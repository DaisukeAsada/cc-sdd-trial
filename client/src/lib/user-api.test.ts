/**
 * user-api テスト
 *
 * 利用者APIクライアントのテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUser, getUser, searchUsers, getUserLoans } from './user-api';
import { apiClient } from './api-client';
import type { User, UserWithLoans } from './user-api';

// API clientをモック
vi.mock('./api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockUser: User = {
  id: 'user-1',
  name: '山田太郎',
  address: '東京都渋谷区1-2-3',
  email: 'yamada@example.com',
  phone: '03-1234-5678',
  registeredAt: '2024-12-10T10:00:00.000Z',
  loanLimit: 5,
};

const mockUserWithLoans: UserWithLoans = {
  user: mockUser,
  currentLoans: [
    {
      id: 'loan-1',
      bookCopyId: 'copy-1',
      bookTitle: 'TypeScript入門',
      borrowedAt: '2024-12-01T10:00:00.000Z',
      dueDate: '2024-12-15T10:00:00.000Z',
      returnedAt: null,
      isOverdue: false,
    },
  ],
  loanHistory: [
    {
      id: 'loan-2',
      bookCopyId: 'copy-2',
      bookTitle: 'JavaScript入門',
      borrowedAt: '2024-11-01T10:00:00.000Z',
      dueDate: '2024-11-15T10:00:00.000Z',
      returnedAt: '2024-11-14T10:00:00.000Z',
      isOverdue: false,
    },
  ],
};

describe('user-api', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('createUser', () => {
    it('利用者を登録できる', async () => {
      vi.mocked(apiClient.post).mockResolvedValue(mockUser);

      const result = await createUser({
        name: '山田太郎',
        email: 'yamada@example.com',
        address: '東京都渋谷区1-2-3',
        phone: '03-1234-5678',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/users', {
        name: '山田太郎',
        email: 'yamada@example.com',
        address: '東京都渋谷区1-2-3',
        phone: '03-1234-5678',
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('getUser', () => {
    it('利用者詳細を取得できる', async () => {
      vi.mocked(apiClient.get).mockResolvedValue(mockUser);

      const result = await getUser('user-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/users/user-1');
      expect(result).toEqual(mockUser);
    });
  });

  describe('searchUsers', () => {
    it('名前で検索できる', async () => {
      vi.mocked(apiClient.get).mockResolvedValue([mockUser]);

      const result = await searchUsers({ name: '山田' });

      expect(apiClient.get).toHaveBeenCalledWith('/api/users/search?name=%E5%B1%B1%E7%94%B0');
      expect(result).toEqual([mockUser]);
    });

    it('複数条件で検索できる', async () => {
      vi.mocked(apiClient.get).mockResolvedValue([mockUser]);

      const result = await searchUsers({ name: '山田', email: 'yamada' });

      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/users/search?name=%E5%B1%B1%E7%94%B0&email=yamada'
      );
      expect(result).toEqual([mockUser]);
    });

    it('条件なしで検索できる', async () => {
      vi.mocked(apiClient.get).mockResolvedValue([mockUser]);

      const result = await searchUsers({});

      expect(apiClient.get).toHaveBeenCalledWith('/api/users/search');
      expect(result).toEqual([mockUser]);
    });
  });

  describe('getUserLoans', () => {
    it('利用者の貸出履歴を取得できる', async () => {
      vi.mocked(apiClient.get).mockResolvedValue(mockUserWithLoans);

      const result = await getUserLoans('user-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/users/user-1/loans');
      expect(result).toEqual(mockUserWithLoans);
    });
  });
});
