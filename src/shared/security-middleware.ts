/**
 * Security Middleware
 *
 * APIセキュリティ対策のためのExpressミドルウェア
 * - CSPヘッダー設定
 * - 入力サニタイズ
 * - パラメータバリデーション
 * - SQLクエリビルダー（パラメータ化クエリ対応）
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { sanitizeObject, validateUUID } from './security.js';

// ============================================
// セキュリティヘッダーミドルウェア
// ============================================

/**
 * Content Security Policy設定
 */
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

/**
 * セキュリティヘッダーを設定するミドルウェア
 *
 * 設定されるヘッダー:
 * - Content-Security-Policy: XSS攻撃防止
 * - X-Content-Type-Options: MIMEタイプスニッフィング防止
 * - X-Frame-Options: クリックジャッキング防止
 * - X-XSS-Protection: ブラウザのXSSフィルター有効化
 * - Strict-Transport-Security: HTTPS強制
 */
export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction): void {
  // Content Security Policy
  res.setHeader('Content-Security-Policy', CSP_DIRECTIVES);

  // MIMEタイプスニッフィング防止
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // クリックジャッキング防止
  res.setHeader('X-Frame-Options', 'DENY');

  // ブラウザのXSSフィルター有効化
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // HTTPS強制（1年間）
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  next();
}

// ============================================
// 入力サニタイズミドルウェア
// ============================================

/**
 * Record型かどうかをチェック
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * リクエストの入力をサニタイズするミドルウェア
 *
 * サニタイズ対象:
 * - req.body: リクエストボディ
 *
 * Note: Express 5.x では req.query と req.params は読み取り専用のため、
 * body のみをサニタイズします。query/params のサニタイズが必要な場合は、
 * 各ルートハンドラ内で個別に処理してください。
 */
export function sanitizeInputMiddleware(req: Request, _res: Response, next: NextFunction): void {
  // body のサニタイズ
  if (isRecord(req.body)) {
    req.body = sanitizeObject(req.body);
  }

  // Note: Express 5.x では req.query と req.params は読み取り専用（getter only）
  // のため、直接上書きできません。必要に応じてルートハンドラで個別にサニタイズしてください。

  next();
}

// ============================================
// パラメータバリデーションミドルウェア
// ============================================

/**
 * リクエストパラメータのUUID形式を検証するミドルウェアファクトリ
 *
 * @param paramNames - 検証対象のパラメータ名の配列
 * @returns Expressミドルウェア
 */
export function validateRequestParams(paramNames: string[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    for (const paramName of paramNames) {
      const value = req.params[paramName];
      if (value !== undefined) {
        const result = validateUUID(value, paramName);
        if (!result.success) {
          res.status(400).json({ error: result.error });
          return;
        }
      }
    }
    next();
  };
}

// ============================================
// SQLクエリビルダー（パラメータ化クエリ対応）
// ============================================

/** ビルドされたクエリ結果 */
export interface BuiltQuery {
  text: string;
  values: unknown[];
}

/** 比較演算子 */
type ComparisonOperator = '=' | '!=' | '<' | '<=' | '>' | '>=' | 'LIKE' | 'ILIKE';

/** ソート順 */
type SortOrder = 'ASC' | 'DESC';

/**
 * SQLクエリビルダー
 *
 * パラメータ化クエリを安全に構築するためのビルダー。
 * SQLインジェクション対策として、すべての値はプレースホルダーで処理。
 */
export interface QueryBuilder {
  /** WHERE条件を追加 */
  where(column: string, operator: ComparisonOperator, value: unknown): QueryBuilder;
  /** AND条件を追加 */
  andWhere(column: string, operator: ComparisonOperator, value: unknown): QueryBuilder;
  /** OR条件を追加 */
  orWhere(column: string, operator: ComparisonOperator, value: unknown): QueryBuilder;
  /** IN条件を追加 */
  whereIn(column: string, values: unknown[]): QueryBuilder;
  /** IS NULL条件を追加 */
  whereNull(column: string): QueryBuilder;
  /** IS NOT NULL条件を追加 */
  whereNotNull(column: string): QueryBuilder;
  /** ORDER BY句を追加 */
  orderBy(column: string, order: SortOrder): QueryBuilder;
  /** LIMIT句を追加 */
  limit(count: number): QueryBuilder;
  /** OFFSET句を追加 */
  offset(count: number): QueryBuilder;
  /** クエリをビルド */
  build(): BuiltQuery;
}

/**
 * パラメータ化SQLクエリビルダーを作成
 *
 * @param baseQuery - ベースとなるSELECT文
 * @returns QueryBuilder インスタンス
 *
 * @example
 * const builder = createQueryBuilder('SELECT * FROM books');
 * builder.where('title', 'LIKE', '%test%');
 * builder.andWhere('status', '=', 'AVAILABLE');
 * const { text, values } = builder.build();
 * // text: 'SELECT * FROM books WHERE title LIKE $1 AND status = $2'
 * // values: ['%test%', 'AVAILABLE']
 */
export function createQueryBuilder(baseQuery: string): QueryBuilder {
  const whereClauses: string[] = [];
  const values: unknown[] = [];
  let orderByClause = '';
  let limitValue: number | null = null;
  let offsetValue: number | null = null;

  const getNextPlaceholder = (): string => `$${String(values.length + 1)}`;

  const builder: QueryBuilder = {
    where(column: string, operator: ComparisonOperator, value: unknown): QueryBuilder {
      const placeholder = getNextPlaceholder();
      values.push(value);
      whereClauses.push(`${column} ${operator} ${placeholder}`);
      return builder;
    },

    andWhere(column: string, operator: ComparisonOperator, value: unknown): QueryBuilder {
      const placeholder = getNextPlaceholder();
      values.push(value);
      whereClauses.push(`AND ${column} ${operator} ${placeholder}`);
      return builder;
    },

    orWhere(column: string, operator: ComparisonOperator, value: unknown): QueryBuilder {
      const placeholder = getNextPlaceholder();
      values.push(value);
      whereClauses.push(`OR ${column} ${operator} ${placeholder}`);
      return builder;
    },

    whereIn(column: string, inValues: unknown[]): QueryBuilder {
      const placeholders: string[] = [];
      for (const v of inValues) {
        placeholders.push(getNextPlaceholder());
        values.push(v);
      }
      whereClauses.push(`${column} IN (${placeholders.join(', ')})`);
      return builder;
    },

    whereNull(column: string): QueryBuilder {
      whereClauses.push(`${column} IS NULL`);
      return builder;
    },

    whereNotNull(column: string): QueryBuilder {
      whereClauses.push(`${column} IS NOT NULL`);
      return builder;
    },

    orderBy(column: string, order: SortOrder): QueryBuilder {
      orderByClause = ` ORDER BY ${column} ${order}`;
      return builder;
    },

    limit(count: number): QueryBuilder {
      limitValue = count;
      return builder;
    },

    offset(count: number): QueryBuilder {
      offsetValue = count;
      return builder;
    },

    build(): BuiltQuery {
      let text = baseQuery;

      // WHERE句の構築
      if (whereClauses.length > 0) {
        text += ' WHERE ' + whereClauses.join(' ');
      }

      // ORDER BY句の追加
      if (orderByClause !== '') {
        text += orderByClause;
      }

      // LIMIT句の追加
      if (limitValue !== null) {
        const placeholder = `$${String(values.length + 1)}`;
        values.push(limitValue);
        text += ` LIMIT ${placeholder}`;
      }

      // OFFSET句の追加
      if (offsetValue !== null) {
        const placeholder = `$${String(values.length + 1)}`;
        values.push(offsetValue);
        text += ` OFFSET ${placeholder}`;
      }

      return { text, values };
    },
  };

  return builder;
}
