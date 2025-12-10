import React, { useState, useCallback, type FormEvent, type ChangeEvent } from 'react';
import { Alert, DataTable, type Column } from '../components';
import {
  getStatisticsSummary,
  getPopularBooksRanking,
  getCategoryStatistics,
  exportToCsv,
  downloadCsv,
  type StatisticsSummary,
  type PopularBooksRanking,
  type PopularBookItem,
  type CategoryStatistics,
  type CategoryStatisticsItem,
} from '../lib/report-api';
import { ApiError } from '../lib/api-client';

// ============================================
// 型定義
// ============================================

/** アラート情報 */
interface AlertInfo {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

/** バリデーションエラー */
interface ValidationErrors {
  startDate?: string;
  endDate?: string;
  dateRange?: string;
}

/** レポートデータ */
interface ReportData {
  summary: StatisticsSummary | null;
  popularBooks: PopularBooksRanking | null;
  categoryStats: CategoryStatistics | null;
}

// ============================================
// ヘルパー関数
// ============================================

/**
 * デフォルトの日付範囲を取得（今月1日〜今日）
 */
function getDefaultDateRange(): { startDate: string; endDate: string } {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    startDate: startOfMonth.toISOString().split('T')[0] ?? '',
    endDate: today.toISOString().split('T')[0] ?? '',
  };
}

// ============================================
// サブコンポーネント
// ============================================

/**
 * 統計サマリーカード
 */
function StatisticsSummaryCard({
  summary,
}: {
  readonly summary: StatisticsSummary;
}): React.ReactElement {
  return (
    <div className="statistics-summary" data-testid="statistics-summary">
      <h2>統計サマリー</h2>
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-label">貸出数</div>
          <div className="summary-value">{summary.loanCount}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">返却数</div>
          <div className="summary-value">{summary.returnCount}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">延滞数</div>
          <div className="summary-value">{summary.overdueCount}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * 人気書籍ランキング表示
 */
function PopularBooksRankingTable({
  ranking,
}: {
  readonly ranking: PopularBooksRanking;
}): React.ReactElement {
  const columns: Column<PopularBookItem>[] = [
    { key: 'rank', header: '順位', width: '80px' },
    { key: 'title', header: 'タイトル' },
    { key: 'author', header: '著者' },
    { key: 'loanCount', header: '貸出回数', width: '100px' },
  ];

  return (
    <div className="popular-books-ranking" data-testid="popular-books-ranking">
      <h2>人気書籍ランキング</h2>
      <DataTable
        data={ranking.items}
        columns={columns}
        keyField="bookId"
        emptyMessage="データがありません"
        ariaLabel="人気書籍ランキング"
        className="popular-books-table"
        data-testid="popular-books-table"
      />
    </div>
  );
}

/**
 * カテゴリ別貸出統計表示
 */
function CategoryStatisticsTable({
  stats,
}: {
  readonly stats: CategoryStatistics;
}): React.ReactElement {
  const columns: Column<CategoryStatisticsItem>[] = [
    { key: 'category', header: 'カテゴリ' },
    { key: 'loanCount', header: '貸出回数', width: '100px' },
    {
      key: 'percentage',
      header: '割合',
      width: '100px',
      render: (item) => `${item.percentage.toFixed(1)}%`,
    },
  ];

  return (
    <div className="category-statistics" data-testid="category-statistics">
      <h2>カテゴリ別貸出統計</h2>
      <div className="total-loan-count">
        合計貸出数: {stats.totalLoanCount}
      </div>
      <DataTable
        data={stats.items}
        columns={columns}
        keyField="category"
        emptyMessage="データがありません"
        ariaLabel="カテゴリ別貸出統計"
        className="category-statistics-table"
        data-testid="category-statistics-table"
      />
    </div>
  );
}

// ============================================
// メインコンポーネント
// ============================================

/**
 * レポートページ
 */
export function ReportsPage(): React.ReactElement {
  // 日付範囲状態
  const defaultRange = getDefaultDateRange();
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);

  // レポートデータ状態
  const [reportData, setReportData] = useState<ReportData>({
    summary: null,
    popularBooks: null,
    categoryStats: null,
  });

  // UI状態
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<AlertInfo | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [csvLoading, setCsvLoading] = useState<Record<string, boolean>>({});

  // ============================================
  // バリデーション
  // ============================================

  const validateForm = useCallback((): boolean => {
    const errors: ValidationErrors = {};

    if (startDate.trim() === '') {
      errors.startDate = '開始日は必須です';
    }
    if (endDate.trim() === '') {
      errors.endDate = '終了日は必須です';
    }

    // 日付範囲チェック
    if (startDate !== '' && endDate !== '') {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start > end) {
        errors.dateRange = '開始日は終了日より前である必要があります';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [startDate, endDate]);

  // ============================================
  // レポート生成
  // ============================================

  const handleGenerateReport = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setAlert(null);

      if (!validateForm()) {
        return;
      }

      setLoading(true);
      setReportData({ summary: null, popularBooks: null, categoryStats: null });

      try {
        // 並行してAPIを呼び出す
        const [summary, popularBooks, categoryStats] = await Promise.all([
          getStatisticsSummary(startDate, endDate),
          getPopularBooksRanking(startDate, endDate, 10),
          getCategoryStatistics(startDate, endDate),
        ]);

        setReportData({ summary, popularBooks, categoryStats });
      } catch (error) {
        if (error instanceof ApiError) {
          setAlert({
            message: error.message,
            type: 'error',
          });
        } else {
          setAlert({
            message: '予期しないエラーが発生しました',
            type: 'error',
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [startDate, endDate, validateForm]
  );

  // ============================================
  // CSVダウンロード
  // ============================================

  const handleCsvDownload = useCallback(
    async (type: 'summary' | 'popular' | 'category') => {
      setCsvLoading((prev) => ({ ...prev, [type]: true }));

      try {
        const limit = type === 'popular' ? 10 : undefined;
        const csvContent = await exportToCsv(type, startDate, endDate, limit);

        const filename = `report_${type}_${startDate}_${endDate}.csv`;
        downloadCsv(csvContent, filename);
      } catch (error) {
        if (error instanceof ApiError) {
          setAlert({
            message: `CSVエクスポートに失敗しました: ${error.message}`,
            type: 'error',
          });
        } else {
          setAlert({
            message: 'CSVエクスポート中に予期しないエラーが発生しました',
            type: 'error',
          });
        }
      } finally {
        setCsvLoading((prev) => ({ ...prev, [type]: false }));
      }
    },
    [startDate, endDate]
  );

  // ============================================
  // レンダリング
  // ============================================

  return (
    <div data-testid="reports-page" className="reports-page">
      <h1>レポート・統計</h1>

      {/* アラート */}
      {alert !== null && (
        <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
      )}

      {/* 期間指定フォーム */}
      <form onSubmit={handleGenerateReport} className="date-range-form">
        <div className="form-row">
          <div className="form-input-container">
            <label htmlFor="startDate" className="form-input-label">
              開始日
              <span className="form-input-required">*</span>
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
              className={`form-input ${validationErrors.startDate !== undefined ? 'form-input-error' : ''}`}
              required
            />
            {validationErrors.startDate !== undefined && (
              <div className="form-input-error-message" role="alert">
                {validationErrors.startDate}
              </div>
            )}
          </div>
          <div className="form-input-container">
            <label htmlFor="endDate" className="form-input-label">
              終了日
              <span className="form-input-required">*</span>
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
              className={`form-input ${validationErrors.endDate !== undefined ? 'form-input-error' : ''}`}
              required
            />
            {validationErrors.endDate !== undefined && (
              <div className="form-input-error-message" role="alert">
                {validationErrors.endDate}
              </div>
            )}
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '読み込み中...' : 'レポート生成'}
          </button>
        </div>
        {validationErrors.dateRange !== undefined && (
          <div className="error-message">{validationErrors.dateRange}</div>
        )}
      </form>

      {/* ローディング */}
      {loading && (
        <div className="loading-indicator" role="status">
          <span className="spinner" />
          <span>読み込み中...</span>
        </div>
      )}

      {/* レポートコンテンツ */}
      {!loading && reportData.summary !== null && (
        <div className="report-content">
          {/* 統計サマリー */}
          <section className="report-section">
            <StatisticsSummaryCard summary={reportData.summary} />
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleCsvDownload('summary')}
              disabled={csvLoading['summary'] === true}
            >
              {csvLoading['summary'] === true ? 'ダウンロード中...' : '統計CSVダウンロード'}
            </button>
          </section>

          {/* 人気書籍ランキング */}
          {reportData.popularBooks !== null && (
            <section className="report-section">
              <PopularBooksRankingTable ranking={reportData.popularBooks} />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleCsvDownload('popular')}
                disabled={csvLoading['popular'] === true}
              >
                {csvLoading['popular'] === true ? 'ダウンロード中...' : 'ランキングCSVダウンロード'}
              </button>
            </section>
          )}

          {/* カテゴリ別貸出統計 */}
          {reportData.categoryStats !== null && (
            <section className="report-section">
              <CategoryStatisticsTable stats={reportData.categoryStats} />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleCsvDownload('category')}
                disabled={csvLoading['category'] === true}
              >
                {csvLoading['category'] === true ? 'ダウンロード中...' : 'カテゴリCSVダウンロード'}
              </button>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
