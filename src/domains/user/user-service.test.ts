/**
 * UserService Unit Tests
 *
 * TDD: RED → GREEN → REFACTOR
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserService, createUserService } from './user-service.js';
import type { UserRepository } from './user-repository.js';
import type { User, CreateUserInput, UpdateUserInput, DEFAULT_LOAN_LIMIT } from './types.js';
import { createUserId } from '../../shared/branded-types.js';
import { ok, err, isOk, isErr } from '../../shared/result.js';

// ============================================
// モックリポジトリ作成ヘルパー
// ============================================

function createMockRepository(
  overrides: Partial<UserRepository> = {}
): UserRepository {
  return {
    create: vi.fn().mockResolvedValue(ok(createMockUser())),
    findById: vi.fn().mockResolvedValue(ok(createMockUser())),
    findByEmail: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(ok(createMockUser())),
    delete: vi.fn().mockResolvedValue(ok(undefined)),
    ...overrides,
  };
}

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: createUserId('user-123'),
    name: 'テストユーザー',
    address: '東京都渋谷区',
    email: 'test@example.com',
    phone: '03-1234-5678',
    registeredAt: new Date('2024-01-01'),
    loanLimit: 5,
    ...overrides,
  };
}

// ============================================
// 利用者登録テスト
// ============================================

describe('UserService', () => {
  let service: UserService;
  let mockRepository: UserRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = createUserService(mockRepository);
  });

  describe('createUser', () => {
    it('正常な入力で利用者を登録できる', async () => {
      const input: CreateUserInput = {
        name: 'テストユーザー',
        email: 'test@example.com',
        address: '東京都渋谷区',
        phone: '03-1234-5678',
      };

      const result = await service.createUser(input);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.name).toBe('テストユーザー');
        expect(result.value.email).toBe('test@example.com');
        expect(result.value.loanLimit).toBe(5);
      }
    });

    it('氏名が空の場合はバリデーションエラーを返す', async () => {
      const input: CreateUserInput = {
        name: '',
        email: 'test@example.com',
      };

      const result = await service.createUser(input);

      expect(isErr(result)).toBe(true);
      if (isErr(result) && result.error.type === 'VALIDATION_ERROR') {
        expect(result.error.field).toBe('name');
      }
    });

    it('氏名がスペースのみの場合はバリデーションエラーを返す', async () => {
      const input: CreateUserInput = {
        name: '   ',
        email: 'test@example.com',
      };

      const result = await service.createUser(input);

      expect(isErr(result)).toBe(true);
      if (isErr(result) && result.error.type === 'VALIDATION_ERROR') {
        expect(result.error.field).toBe('name');
      }
    });

    it('メールアドレスが空の場合はバリデーションエラーを返す', async () => {
      const input: CreateUserInput = {
        name: 'テストユーザー',
        email: '',
      };

      const result = await service.createUser(input);

      expect(isErr(result)).toBe(true);
      if (isErr(result) && result.error.type === 'VALIDATION_ERROR') {
        expect(result.error.field).toBe('email');
      }
    });

    it('メールアドレス形式が不正な場合はバリデーションエラーを返す', async () => {
      const input: CreateUserInput = {
        name: 'テストユーザー',
        email: 'invalid-email',
      };

      const result = await service.createUser(input);

      expect(isErr(result)).toBe(true);
      if (isErr(result) && result.error.type === 'VALIDATION_ERROR') {
        expect(result.error.field).toBe('email');
      }
    });

    it('メールアドレスが重複している場合はDUPLICATE_EMAILエラーを返す', async () => {
      const existingUser = createMockUser({ email: 'existing@example.com' });
      mockRepository = createMockRepository({
        findByEmail: vi.fn().mockResolvedValue(existingUser),
      });
      service = createUserService(mockRepository);

      const input: CreateUserInput = {
        name: 'テストユーザー',
        email: 'existing@example.com',
      };

      const result = await service.createUser(input);

      expect(isErr(result)).toBe(true);
      if (isErr(result) && result.error.type === 'DUPLICATE_EMAIL') {
        expect(result.error.email).toBe('existing@example.com');
      }
    });

    it('貸出上限のデフォルト値は5', async () => {
      const input: CreateUserInput = {
        name: 'テストユーザー',
        email: 'test@example.com',
      };

      await service.createUser(input);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          loanLimit: 5,
        })
      );
    });

    it('貸出上限をカスタム値で設定できる', async () => {
      const input: CreateUserInput = {
        name: 'テストユーザー',
        email: 'test@example.com',
        loanLimit: 10,
      };

      await service.createUser(input);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          loanLimit: 10,
        })
      );
    });

    it('貸出上限が0以下の場合はバリデーションエラーを返す', async () => {
      const input: CreateUserInput = {
        name: 'テストユーザー',
        email: 'test@example.com',
        loanLimit: 0,
      };

      const result = await service.createUser(input);

      expect(isErr(result)).toBe(true);
      if (isErr(result) && result.error.type === 'VALIDATION_ERROR') {
        expect(result.error.field).toBe('loanLimit');
      }
    });

    it('貸出上限が負の値の場合はバリデーションエラーを返す', async () => {
      const input: CreateUserInput = {
        name: 'テストユーザー',
        email: 'test@example.com',
        loanLimit: -1,
      };

      const result = await service.createUser(input);

      expect(isErr(result)).toBe(true);
      if (isErr(result) && result.error.type === 'VALIDATION_ERROR') {
        expect(result.error.field).toBe('loanLimit');
      }
    });
  });

  // ============================================
  // 利用者取得テスト
  // ============================================

  describe('getUserById', () => {
    it('存在する利用者IDで利用者を取得できる', async () => {
      const userId = createUserId('user-123');
      const expectedUser = createMockUser({ id: userId });
      mockRepository = createMockRepository({
        findById: vi.fn().mockResolvedValue(ok(expectedUser)),
      });
      service = createUserService(mockRepository);

      const result = await service.getUserById(userId);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.id).toBe(userId);
        expect(result.value.name).toBe('テストユーザー');
      }
    });

    it('存在しない利用者IDの場合はNOT_FOUNDエラーを返す', async () => {
      const userId = createUserId('non-existent');
      mockRepository = createMockRepository({
        findById: vi.fn().mockResolvedValue(
          err({ type: 'NOT_FOUND' as const, id: 'non-existent' })
        ),
      });
      service = createUserService(mockRepository);

      const result = await service.getUserById(userId);

      expect(isErr(result)).toBe(true);
      if (isErr(result) && result.error.type === 'NOT_FOUND') {
        expect(result.error.id).toBe('non-existent');
      }
    });
  });

  // ============================================
  // 利用者更新テスト
  // ============================================

  describe('updateUser', () => {
    it('利用者情報を更新できる', async () => {
      const userId = createUserId('user-123');
      const updateInput: UpdateUserInput = {
        name: '更新後ユーザー',
        address: '大阪府大阪市',
      };
      const updatedUser = createMockUser({
        id: userId,
        name: '更新後ユーザー',
        address: '大阪府大阪市',
      });
      mockRepository = createMockRepository({
        findById: vi.fn().mockResolvedValue(ok(createMockUser({ id: userId }))),
        update: vi.fn().mockResolvedValue(ok(updatedUser)),
      });
      service = createUserService(mockRepository);

      const result = await service.updateUser(userId, updateInput);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.name).toBe('更新後ユーザー');
        expect(result.value.address).toBe('大阪府大阪市');
      }
    });

    it('存在しない利用者IDの場合はNOT_FOUNDエラーを返す', async () => {
      const userId = createUserId('non-existent');
      mockRepository = createMockRepository({
        findById: vi.fn().mockResolvedValue(
          err({ type: 'NOT_FOUND' as const, id: 'non-existent' })
        ),
      });
      service = createUserService(mockRepository);

      const updateInput: UpdateUserInput = { name: '更新後ユーザー' };
      const result = await service.updateUser(userId, updateInput);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe('NOT_FOUND');
      }
    });

    it('更新時に名前を空にするとバリデーションエラーを返す', async () => {
      const userId = createUserId('user-123');
      mockRepository = createMockRepository({
        findById: vi.fn().mockResolvedValue(ok(createMockUser({ id: userId }))),
      });
      service = createUserService(mockRepository);

      const updateInput: UpdateUserInput = { name: '' };
      const result = await service.updateUser(userId, updateInput);

      expect(isErr(result)).toBe(true);
      if (isErr(result) && result.error.type === 'VALIDATION_ERROR') {
        expect(result.error.field).toBe('name');
      }
    });

    it('更新時にメールを不正な形式にするとバリデーションエラーを返す', async () => {
      const userId = createUserId('user-123');
      mockRepository = createMockRepository({
        findById: vi.fn().mockResolvedValue(ok(createMockUser({ id: userId }))),
      });
      service = createUserService(mockRepository);

      const updateInput: UpdateUserInput = { email: 'invalid-email' };
      const result = await service.updateUser(userId, updateInput);

      expect(isErr(result)).toBe(true);
      if (isErr(result) && result.error.type === 'VALIDATION_ERROR') {
        expect(result.error.field).toBe('email');
      }
    });

    it('更新時にメールアドレスが他の利用者と重複するとDUPLICATE_EMAILエラーを返す', async () => {
      const userId = createUserId('user-123');
      const existingUser = createMockUser({ id: createUserId('user-456'), email: 'other@example.com' });
      mockRepository = createMockRepository({
        findById: vi.fn().mockResolvedValue(ok(createMockUser({ id: userId, email: 'current@example.com' }))),
        findByEmail: vi.fn().mockResolvedValue(existingUser),
      });
      service = createUserService(mockRepository);

      const updateInput: UpdateUserInput = { email: 'other@example.com' };
      const result = await service.updateUser(userId, updateInput);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe('DUPLICATE_EMAIL');
      }
    });

    it('更新時に自分と同じメールアドレスはエラーにならない', async () => {
      const userId = createUserId('user-123');
      const currentUser = createMockUser({ id: userId, email: 'same@example.com' });
      mockRepository = createMockRepository({
        findById: vi.fn().mockResolvedValue(ok(currentUser)),
        findByEmail: vi.fn().mockResolvedValue(currentUser),
        update: vi.fn().mockResolvedValue(ok(currentUser)),
      });
      service = createUserService(mockRepository);

      const updateInput: UpdateUserInput = { email: 'same@example.com' };
      const result = await service.updateUser(userId, updateInput);

      expect(isOk(result)).toBe(true);
    });

    it('更新時に貸出上限を0以下にするとバリデーションエラーを返す', async () => {
      const userId = createUserId('user-123');
      mockRepository = createMockRepository({
        findById: vi.fn().mockResolvedValue(ok(createMockUser({ id: userId }))),
      });
      service = createUserService(mockRepository);

      const updateInput: UpdateUserInput = { loanLimit: 0 };
      const result = await service.updateUser(userId, updateInput);

      expect(isErr(result)).toBe(true);
      if (isErr(result) && result.error.type === 'VALIDATION_ERROR') {
        expect(result.error.field).toBe('loanLimit');
      }
    });
  });

  // ============================================
  // 利用者削除テスト
  // ============================================

  describe('deleteUser', () => {
    it('利用者を削除できる', async () => {
      const userId = createUserId('user-123');
      mockRepository = createMockRepository({
        findById: vi.fn().mockResolvedValue(ok(createMockUser({ id: userId }))),
        delete: vi.fn().mockResolvedValue(ok(undefined)),
      });
      service = createUserService(mockRepository);

      const result = await service.deleteUser(userId);

      expect(isOk(result)).toBe(true);
    });

    it('存在しない利用者IDの場合はNOT_FOUNDエラーを返す', async () => {
      const userId = createUserId('non-existent');
      mockRepository = createMockRepository({
        findById: vi.fn().mockResolvedValue(
          err({ type: 'NOT_FOUND' as const, id: 'non-existent' })
        ),
      });
      service = createUserService(mockRepository);

      const result = await service.deleteUser(userId);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe('NOT_FOUND');
      }
    });
  });
});
