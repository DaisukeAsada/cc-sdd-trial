/**
 * ReportsPage テスト
 *
 * レポート・統計画面のテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportsPage } from './ReportsPage';
import * as reportApi from '../lib/report-api';
import type {
  StatisticsSummary,
  PopularBooksRanking,
  CategoryStatistics,
} from '../lib/report-api';
import { ApiError } from '../lib/api-client';

// API モック
vi.mock('../lib/report-api');

// ============================================
// モックデータ
// ============================================

const mockDateRange = {
  startDate: '2024-12-01',
  endDate: '2024-12-31',
};

const mockStatisticsSummary: StatisticsSummary = {
  loanCount: 150,
  returnCount: 120,
  overdueCount: 10,
  dateRange: mockDateRange,
};

const mockPopularBooksRanking: PopularBooksRanking = {
  items: [
    { bookId: 'book-1', title: 'TypeScript入門', author: '山田太郎', loanCount: 50, rank: 1 },
    { bookId: 'book-2', title: 'React実践ガイド', author: '鈴木花子', loanCount: 40, rank: 2 },
    { bookId: 'book-3', title: 'Node.js完全入門', author: '佐藤次郎', loanCount: 30, rank: 3 },
  ],
  dateRange: mockDateRange,
};

const mockCategoryStatistics: CategoryStatistics = {
  items: [
    { category: 'プログラミング', loanCount: 80, percentage: 53.3 },
    { category: '文学', loanCount: 40, percentage: 26.7 },
    { category: '科学', loanCount: 30, percentage: 20.0 },
  ],
  totalLoanCount: 150,
  dateRange: mockDateRange,
};

// ============================================
// ユーティリティ関数
// ============================================

/**
 * デフォルトの日付範囲を取得（今月1日～今日）
 */
function getDefaultDateRange(): { startDate: string; endDate: string } {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    startDate: startOfMonth.toISOString().split('T')[0] ?? '',
    endDate: today.toISOString().split('T')[0] ?? '',
  };
}

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // デフォルトのモック設定
    vi.mocked(reportApi.getStatisticsSummary).mockResolvedValue(mockStatisticsSummary);
    vi.mocked(reportApi.getPopularBooksRanking).mockResolvedValue(mockPopularBooksRanking);
    vi.mocked(reportApi.getCategoryStatistics).mockResolvedValue(mockCategoryStatistics);
  });

  // ============================================
  // 画面表示テスト
  // ============================================

  describe('画面表示', () => {
    it('ページタイトルが表示される', () => {
      render(<ReportsPage />);

      expect(
        screen.getByRole('heading', { name: 'レポート・統計' })
      ).toBeInTheDocument();
    });

    it('期間指定フォームが表示される', () => {
      render(<ReportsPage />);

      expect(screen.getByLabelText(/開始日/)).toBeInTheDocument();
      expect(screen.getByLabelText(/終了日/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'レポート生成' })).toBeInTheDocument();
    });

    it('デフォルトで今月1日から今日までの期間が設定される', () => {
      render(<ReportsPage />);

      const { startDate, endDate } = getDefaultDateRange();
      const startInput = screen.getByLabelText(/開始日/) as HTMLInputElement;
      const endInput = screen.getByLabelText(/終了日/) as HTMLInputElement;

      expect(startInput.value).toBe(startDate);
      expect(endInput.value).toBe(endDate);
    });
  });

  // ============================================
  // 統計サマリーダッシュボードテスト
  // ============================================

  describe('統計サマリーダッシュボード', () => {
    it('レポート生成ボタンクリックで統計サマリーが表示される', async () => {
      const user = userEvent.setup();
      render(<ReportsPage />);

      await user.click(screen.getByRole('button', { name: 'レポート生成' }));

      await waitFor(() => {
        expect(screen.getByText('貸出数')).toBeInTheDocument();
        expect(screen.getByText('150')).toBeInTheDocument();
        expect(screen.getByText('返却数')).toBeInTheDocument();
        expect(screen.getByText('120')).toBeInTheDocument();
        expect(screen.getByText('延滞数')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
      });
    });

    it('ローディング中はスピナーが表示される', async () => {
      vi.mocked(reportApi.getStatisticsSummary).mockImplementation(
        () => new Promise(() => {}) // 解決しないPromise
      );
      vi.mocked(reportApi.getPopularBooksRanking).mockImplementation(
        () => new Promise(() => {})
      );
      vi.mocked(reportApi.getCategoryStatistics).mockImplementation(
        () => new Promise(() => {})
      );

      const user = userEvent.setup();
      render(<ReportsPage />);

      await user.click(screen.getByRole('button', { name: 'レポート生成' }));

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });
    });

    it('APIエラーの場合、エラーメッセージが表示される', async () => {
      const errorMessage = 'サーバーでエラーが発生しました';
      vi.mocked(reportApi.getStatisticsSummary).mockRejectedValue(
        new ApiError(400, errorMessage)
      );

      const user = userEvent.setup();
      render(<ReportsPage />);

      await user.click(screen.getByRole('button', { name: 'レポート生成' }));

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // 人気書籍ランキングテスト
  // ============================================

  describe('人気書籍ランキング', () => {
    it('人気書籍ランキングが表示される', async () => {
      const user = userEvent.setup();
      render(<ReportsPage />);

      await user.click(screen.getByRole('button', { name: 'レポート生成' }));

      await waitFor(() => {
        expect(screen.getByText('人気書籍ランキング')).toBeInTheDocument();
        expect(screen.getByText('TypeScript入門')).toBeInTheDocument();
        expect(screen.getByText('山田太郎')).toBeInTheDocument();
        expect(screen.getByText('React実践ガイド')).toBeInTheDocument();
      });
    });

    it('ランキングがテーブル形式で表示される', async () => {
      const user = userEvent.setup();
      render(<ReportsPage />);

      await user.click(screen.getByRole('button', { name: 'レポート生成' }));

      await waitFor(() => {
        const rankingTable = screen.getByLabelText('人気書籍ランキング');
        expect(rankingTable).toBeInTheDocument();

        const rows = within(rankingTable).getAllByRole('row');
        // ヘッダー + 3データ行
        expect(rows.length).toBe(4);
      });
    });
  });

  // ============================================
  // カテゴリ別貸出統計テスト
  // ============================================

  describe('カテゴリ別貸出統計', () => {
    it('カテゴリ別貸出統計が表示される', async () => {
      const user = userEvent.setup();
      render(<ReportsPage />);

      await user.click(screen.getByRole('button', { name: 'レポート生成' }));

      await waitFor(() => {
        expect(screen.getByText('カテゴリ別貸出統計')).toBeInTheDocument();
        expect(screen.getByText('プログラミング')).toBeInTheDocument();
        expect(screen.getByText('53.3%')).toBeInTheDocument();
        expect(screen.getByText('文学')).toBeInTheDocument();
        expect(screen.getByText('科学')).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // 期間指定レポート生成テスト
  // ============================================

  describe('期間指定レポート生成', () => {
    it('デフォルト期間でレポートを生成できる', async () => {
      const user = userEvent.setup();
      render(<ReportsPage />);

      await user.click(screen.getByRole('button', { name: 'レポート生成' }));

      await waitFor(() => {
        expect(reportApi.getStatisticsSummary).toHaveBeenCalled();
      });
    });

    it('開始日が終了日より後の場合、バリデーションエラーが表示される', async () => {
      const user = userEvent.setup();
      render(<ReportsPage />);

      const startInput = screen.getByLabelText(/開始日/) as HTMLInputElement;
      const endInput = screen.getByLabelText(/終了日/) as HTMLInputElement;

      // 開始日を終了日より後に設定（fireEventを使用）
      await user.clear(startInput);
      await user.type(startInput, '2025-12-31');
      await user.clear(endInput);
      await user.type(endInput, '2025-01-01');

      await user.click(screen.getByRole('button', { name: 'レポート生成' }));

      await waitFor(() => {
        expect(screen.getByText(/開始日は終了日より前である必要があります/)).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // CSVダウンロードテスト
  // ============================================

  describe('CSVダウンロード機能', () => {
    it('統計サマリーのCSVダウンロードボタンが表示される', async () => {
      const user = userEvent.setup();
      render(<ReportsPage />);

      await user.click(screen.getByRole('button', { name: 'レポート生成' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '統計CSVダウンロード' })).toBeInTheDocument();
      });
    });

    it('人気書籍ランキングのCSVダウンロードボタンが表示される', async () => {
      const user = userEvent.setup();
      render(<ReportsPage />);

      await user.click(screen.getByRole('button', { name: 'レポート生成' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'ランキングCSVダウンロード' })).toBeInTheDocument();
      });
    });

    it('カテゴリ別統計のCSVダウンロードボタンが表示される', async () => {
      const user = userEvent.setup();
      render(<ReportsPage />);

      await user.click(screen.getByRole('button', { name: 'レポート生成' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'カテゴリCSVダウンロード' })).toBeInTheDocument();
      });
    });

    it('CSVダウンロードボタンをクリックするとexportToCsvが呼ばれる', async () => {
      vi.mocked(reportApi.exportToCsv).mockResolvedValue('header1,header2\nvalue1,value2');

      const user = userEvent.setup();
      render(<ReportsPage />);

      await user.click(screen.getByRole('button', { name: 'レポート生成' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '統計CSVダウンロード' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: '統計CSVダウンロード' }));

      await waitFor(() => {
        expect(reportApi.exportToCsv).toHaveBeenCalledWith(
          'summary',
          expect.any(String),
          expect.any(String),
          undefined
        );
      });
    });
  });

  // ============================================
  // アクセシビリティテスト
  // ============================================

  describe('アクセシビリティ', () => {
    it('テーブルにaria-labelが設定されている', async () => {
      const user = userEvent.setup();
      render(<ReportsPage />);

      await user.click(screen.getByRole('button', { name: 'レポート生成' }));

      await waitFor(() => {
        expect(screen.getByLabelText('人気書籍ランキング')).toBeInTheDocument();
        expect(screen.getByLabelText('カテゴリ別貸出統計')).toBeInTheDocument();
      });
    });
  });
});
