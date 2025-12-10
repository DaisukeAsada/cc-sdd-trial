/**
 * User Repository Interface
 *
 * 利用者データの永続化を担当するリポジトリのインターフェース定義。
 * 具体的な実装は Infrastructure 層で行います。
 */

import type { UserId } from '../../shared/branded-types.js';
import type { Result } from '../../shared/result.js';
import type { User, CreateUserInput, UpdateUserInput, UserError } from './types.js';

// ============================================
// リポジトリインターフェース
// ============================================

/** 利用者リポジトリ */
export interface UserRepository {
  /**
   * 新しい利用者を作成
   * @param input - 利用者登録入力
   * @returns 作成された利用者またはエラー
   */
  create(input: CreateUserInput): Promise<Result<User, UserError>>;

  /**
   * IDで利用者を取得
   * @param id - 利用者ID
   * @returns 利用者またはNOT_FOUNDエラー
   */
  findById(id: UserId): Promise<Result<User, UserError>>;

  /**
   * メールアドレスで利用者を検索
   * @param email - メールアドレス
   * @returns 利用者またはnull
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * 利用者を更新
   * @param id - 利用者ID
   * @param input - 更新入力
   * @returns 更新された利用者またはエラー
   */
  update(id: UserId, input: UpdateUserInput): Promise<Result<User, UserError>>;

  /**
   * 利用者を削除
   * @param id - 利用者ID
   * @returns 成功またはNOT_FOUNDエラー
   */
  delete(id: UserId): Promise<Result<void, UserError>>;
}
