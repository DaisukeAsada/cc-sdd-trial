/**
 * レポートAPI クライアント
 *
 * レポート・統計のREST APIとの通信を行うための関数群
 */

import { apiClient } from './api-client';

// ============================================
// 型定義
// ============================================

/** 期間指定 */
export interface DateRange {
  readonly startDate: string;
  readonly endDate: string;
}

/** 統計サマリー */
export interface StatisticsSummary {
  readonly loanCount: number;
  readonly returnCount: number;
  readonly overdueCount: number;
  readonly dateRange: DateRange;
}

/** 人気書籍ランキング項目 */
export interface PopularBookItem {
  readonly bookId: string;
  readonly title: string;
  readonly author: string;
  readonly loanCount: number;
  readonly rank: number;
}

/** 人気書籍ランキング */
export interface PopularBooksRanking {
  readonly items: readonly PopularBookItem[];
  readonly dateRange: DateRange;
}

/** カテゴリ別貸出統計項目 */
export interface CategoryStatisticsItem {
  readonly category: string;
  readonly loanCount: number;
  readonly percentage: number;
}

/** カテゴリ別貸出統計 */
export interface CategoryStatistics {
  readonly items: readonly CategoryStatisticsItem[];
  readonly totalLoanCount: number;
  readonly dateRange: DateRange;
}

/** APIエラーレスポンス */
export interface ReportApiError {
  readonly error: {
    readonly type: 'VALIDATION_ERROR' | 'INVALID_DATE_RANGE';
    readonly field?: string;
    readonly message?: string;
  };
}

// ============================================
// API 関数
// ============================================

const API_BASE = '/api/reports';

/**
 * 期間パラメータをクエリ文字列に変換
 */
function buildDateRangeQuery(startDate: string, endDate: string): string {
  return `startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
}

/**
 * 統計サマリーを取得
 */
export async function getStatisticsSummary(
  startDate: string,
  endDate: string
): Promise<StatisticsSummary> {
  const query = buildDateRangeQuery(startDate, endDate);
  return apiClient.get<StatisticsSummary>(`${API_BASE}/summary?${query}`);
}

/**
 * 人気書籍ランキングを取得
 */
export async function getPopularBooksRanking(
  startDate: string,
  endDate: string,
  limit: number = 10
): Promise<PopularBooksRanking> {
  const query = `${buildDateRangeQuery(startDate, endDate)}&limit=${limit}`;
  return apiClient.get<PopularBooksRanking>(`${API_BASE}/popular?${query}`);
}

/**
 * カテゴリ別貸出統計を取得
 */
export async function getCategoryStatistics(
  startDate: string,
  endDate: string
): Promise<CategoryStatistics> {
  const query = buildDateRangeQuery(startDate, endDate);
  return apiClient.get<CategoryStatistics>(`${API_BASE}/category?${query}`);
}

/**
 * CSVエクスポート
 * @param type - エクスポート種別 ('summary' | 'popular' | 'category')
 * @param startDate - 開始日
 * @param endDate - 終了日
 * @param limit - 取得件数（popular の場合のみ）
 * @returns CSV 文字列
 */
export async function exportToCsv(
  type: 'summary' | 'popular' | 'category',
  startDate: string,
  endDate: string,
  limit?: number
): Promise<string> {
  let query = `${buildDateRangeQuery(startDate, endDate)}&type=${type}`;
  if (limit !== undefined) {
    query += `&limit=${limit}`;
  }
  return apiClient.get<string>(`${API_BASE}/export?${query}`);
}

/**
 * CSVをダウンロード（ブラウザでファイル保存）
 * @param csvContent - CSV 文字列
 * @param filename - ファイル名
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
