/**
 * UserService - 利用者管理サービス
 *
 * 利用者のCRUD操作を提供します。
 */

import type { UserId } from '../../shared/branded-types.js';
import type { Result } from '../../shared/result.js';
import { ok, err, isErr } from '../../shared/result.js';
import { validateRequired, validateEmail } from '../../shared/validation.js';
import type { UserRepository } from './user-repository.js';
import type { User, CreateUserInput, UpdateUserInput, UserError } from './types.js';
import { DEFAULT_LOAN_LIMIT } from './types.js';

// ============================================
// サービスインターフェース
// ============================================

/** UserService インターフェース */
export interface UserService {
  /**
   * 新しい利用者を登録
   * @param input - 利用者登録入力
   * @returns 作成された利用者またはエラー
   */
  createUser(input: CreateUserInput): Promise<Result<User, UserError>>;

  /**
   * IDで利用者を取得
   * @param id - 利用者ID
   * @returns 利用者またはNOT_FOUNDエラー
   */
  getUserById(id: UserId): Promise<Result<User, UserError>>;

  /**
   * 利用者情報を更新
   * @param id - 利用者ID
   * @param input - 更新入力
   * @returns 更新された利用者またはエラー
   */
  updateUser(id: UserId, input: UpdateUserInput): Promise<Result<User, UserError>>;

  /**
   * 利用者を削除
   * @param id - 利用者ID
   * @returns 成功またはNOT_FOUNDエラー
   */
  deleteUser(id: UserId): Promise<Result<void, UserError>>;
}

// ============================================
// バリデーション関数
// ============================================

/**
 * 利用者登録入力をバリデーション
 */
function validateCreateUserInput(
  input: CreateUserInput
): Result<CreateUserInput, UserError> {
  // 氏名必須チェック
  const nameResult = validateRequired(input.name, 'name');
  if (isErr(nameResult)) {
    return err({
      type: 'VALIDATION_ERROR',
      field: 'name',
      message: nameResult.error.message,
    });
  }

  // メールアドレス必須チェック
  const emailRequiredResult = validateRequired(input.email, 'email');
  if (isErr(emailRequiredResult)) {
    return err({
      type: 'VALIDATION_ERROR',
      field: 'email',
      message: emailRequiredResult.error.message,
    });
  }

  // メールアドレス形式チェック
  const emailFormatResult = validateEmail(input.email);
  if (isErr(emailFormatResult)) {
    return err({
      type: 'VALIDATION_ERROR',
      field: 'email',
      message: emailFormatResult.error.message,
    });
  }

  // 貸出上限チェック（指定がある場合）
  if (input.loanLimit !== undefined && input.loanLimit !== null) {
    if (input.loanLimit <= 0) {
      return err({
        type: 'VALIDATION_ERROR',
        field: 'loanLimit',
        message: '貸出上限は1以上である必要があります',
      });
    }
  }

  return ok(input);
}

/**
 * 利用者更新入力をバリデーション
 */
function validateUpdateUserInput(
  input: UpdateUserInput
): Result<UpdateUserInput, UserError> {
  // 氏名が指定されている場合は空でないかチェック
  if (input.name !== undefined) {
    const nameResult = validateRequired(input.name, 'name');
    if (isErr(nameResult)) {
      return err({
        type: 'VALIDATION_ERROR',
        field: 'name',
        message: nameResult.error.message,
      });
    }
  }

  // メールアドレスが指定されている場合は形式チェック
  if (input.email !== undefined) {
    const emailRequiredResult = validateRequired(input.email, 'email');
    if (isErr(emailRequiredResult)) {
      return err({
        type: 'VALIDATION_ERROR',
        field: 'email',
        message: emailRequiredResult.error.message,
      });
    }

    const emailFormatResult = validateEmail(input.email);
    if (isErr(emailFormatResult)) {
      return err({
        type: 'VALIDATION_ERROR',
        field: 'email',
        message: emailFormatResult.error.message,
      });
    }
  }

  // 貸出上限チェック（指定がある場合）
  if (input.loanLimit !== undefined && input.loanLimit !== null) {
    if (input.loanLimit <= 0) {
      return err({
        type: 'VALIDATION_ERROR',
        field: 'loanLimit',
        message: '貸出上限は1以上である必要があります',
      });
    }
  }

  return ok(input);
}

// ============================================
// サービス実装
// ============================================

/** UserService 実装を作成 */
export function createUserService(repository: UserRepository): UserService {
  return {
    async createUser(input: CreateUserInput): Promise<Result<User, UserError>> {
      // 入力バリデーション
      const validationResult = validateCreateUserInput(input);
      if (isErr(validationResult)) {
        return validationResult;
      }

      // メールアドレス重複チェック
      const existingUser = await repository.findByEmail(input.email);
      if (existingUser !== null) {
        return err({
          type: 'DUPLICATE_EMAIL',
          email: input.email,
        });
      }

      // デフォルト値を設定して登録
      const inputWithDefaults: CreateUserInput = {
        ...input,
        loanLimit: input.loanLimit ?? DEFAULT_LOAN_LIMIT,
      };

      return repository.create(inputWithDefaults);
    },

    async getUserById(id: UserId): Promise<Result<User, UserError>> {
      return repository.findById(id);
    },

    async updateUser(id: UserId, input: UpdateUserInput): Promise<Result<User, UserError>> {
      // 利用者存在チェック
      const existingResult = await repository.findById(id);
      if (isErr(existingResult)) {
        return existingResult;
      }

      // 入力バリデーション
      const validationResult = validateUpdateUserInput(input);
      if (isErr(validationResult)) {
        return validationResult;
      }

      // メールアドレス変更時の重複チェック
      if (input.email !== undefined) {
        const existingUser = await repository.findByEmail(input.email);
        // 他の利用者が同じメールアドレスを使っている場合はエラー
        if (existingUser !== null && existingUser.id !== id) {
          return err({
            type: 'DUPLICATE_EMAIL',
            email: input.email,
          });
        }
      }

      return repository.update(id, input);
    },

    async deleteUser(id: UserId): Promise<Result<void, UserError>> {
      // 利用者存在チェック
      const existingResult = await repository.findById(id);
      if (isErr(existingResult)) {
        return existingResult;
      }

      return repository.delete(id);
    },
  };
}
