/**
 * LoansPage テスト
 *
 * 貸出・返却処理画面のテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoansPage } from './LoansPage';
import * as loanApi from '../lib/loan-api';
import type { LoanReceipt, ReturnResult } from '../lib/loan-api';
import { ApiError } from '../lib/api-client';

// API モック
vi.mock('../lib/loan-api');

const mockLoanReceipt: LoanReceipt = {
  loan: {
    id: 'loan-1',
    userId: 'user-1',
    bookCopyId: 'copy-1',
    borrowedAt: '2024-12-10T10:00:00.000Z',
    dueDate: '2024-12-24T10:00:00.000Z',
    returnedAt: null,
  },
  bookTitle: 'TypeScript入門',
  userName: '山田太郎',
};

const mockReturnResult: ReturnResult = {
  loan: {
    id: 'loan-1',
    userId: 'user-1',
    bookCopyId: 'copy-1',
    borrowedAt: '2024-12-10T10:00:00.000Z',
    dueDate: '2024-12-24T10:00:00.000Z',
    returnedAt: '2024-12-15T10:00:00.000Z',
  },
  isOverdue: false,
};

const mockOverdueReturnResult: ReturnResult = {
  loan: {
    id: 'loan-2',
    userId: 'user-2',
    bookCopyId: 'copy-2',
    borrowedAt: '2024-11-01T10:00:00.000Z',
    dueDate: '2024-11-15T10:00:00.000Z',
    returnedAt: '2024-12-10T10:00:00.000Z',
  },
  isOverdue: true,
  overdueDays: 25,
  overdueRecord: {
    id: 'overdue-1',
    loanId: 'loan-2',
    overdueDays: 25,
    recordedAt: '2024-12-10T10:00:00.000Z',
  },
};

describe('LoansPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('画面表示', () => {
    it('ページタイトルが表示される', () => {
      render(<LoansPage />);

      expect(
        screen.getByRole('heading', { name: '貸出管理' })
      ).toBeInTheDocument();
    });

    it('貸出処理タブと返却処理タブが表示される', () => {
      render(<LoansPage />);

      expect(screen.getByRole('tab', { name: '貸出処理' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: '返却処理' })).toBeInTheDocument();
    });

    it('初期表示では貸出タブが選択されている', () => {
      render(<LoansPage />);

      const loanTab = screen.getByRole('tab', { name: '貸出処理' });
      expect(loanTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('貸出処理フォーム', () => {
    it('貸出フォームが表示される', () => {
      render(<LoansPage />);

      expect(screen.getByLabelText(/利用者ID/)).toBeInTheDocument();
      expect(screen.getByLabelText(/蔵書コピーID/)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: '貸出処理を実行' })
      ).toBeInTheDocument();
    });

    it('必須項目が未入力の場合はバリデーションエラー', async () => {
      const user = userEvent.setup();
      render(<LoansPage />);

      await user.click(screen.getByRole('button', { name: '貸出処理を実行' }));

      await waitFor(() => {
        expect(screen.getByText(/利用者IDは必須です/)).toBeInTheDocument();
        expect(screen.getByText(/蔵書コピーIDは必須です/)).toBeInTheDocument();
      });
    });

    it('貸出が成功した場合、レシートが表示される', async () => {
      vi.mocked(loanApi.createLoan).mockResolvedValue(mockLoanReceipt);

      const user = userEvent.setup();
      render(<LoansPage />);

      await user.type(screen.getByLabelText(/利用者ID/), 'user-1');
      await user.type(screen.getByLabelText(/蔵書コピーID/), 'copy-1');
      await user.click(screen.getByRole('button', { name: '貸出処理を実行' }));

      await waitFor(() => {
        expect(screen.getByText('貸出レシート')).toBeInTheDocument();
        expect(screen.getByText('TypeScript入門')).toBeInTheDocument();
        expect(screen.getByText('山田太郎')).toBeInTheDocument();
      });
    });

    it('貸出不可エラーの場合、エラーメッセージが表示される', async () => {
      vi.mocked(loanApi.createLoan).mockRejectedValue(
        new ApiError(409, 'この蔵書は現在貸出できません', {
          error: { type: 'BOOK_NOT_AVAILABLE', copyId: 'copy-1' },
        })
      );

      const user = userEvent.setup();
      render(<LoansPage />);

      await user.type(screen.getByLabelText(/利用者ID/), 'user-1');
      await user.type(screen.getByLabelText(/蔵書コピーID/), 'copy-1');
      await user.click(screen.getByRole('button', { name: '貸出処理を実行' }));

      await waitFor(() => {
        expect(
          screen.getByText(/この蔵書は現在貸出できません/)
        ).toBeInTheDocument();
      });
    });

    it('貸出上限超過エラーの場合、エラーメッセージが表示される', async () => {
      vi.mocked(loanApi.createLoan).mockRejectedValue(
        new ApiError(409, '貸出上限に達しています', {
          error: {
            type: 'LOAN_LIMIT_EXCEEDED',
            userId: 'user-1',
            limit: 5,
            currentCount: 5,
          },
        })
      );

      const user = userEvent.setup();
      render(<LoansPage />);

      await user.type(screen.getByLabelText(/利用者ID/), 'user-1');
      await user.type(screen.getByLabelText(/蔵書コピーID/), 'copy-1');
      await user.click(screen.getByRole('button', { name: '貸出処理を実行' }));

      await waitFor(() => {
        expect(screen.getByText(/貸出上限に達しています/)).toBeInTheDocument();
      });
    });

    it('利用者が見つからない場合、エラーメッセージが表示される', async () => {
      vi.mocked(loanApi.createLoan).mockRejectedValue(
        new ApiError(404, '利用者が見つかりません', {
          error: { type: 'USER_NOT_FOUND', userId: 'user-1' },
        })
      );

      const user = userEvent.setup();
      render(<LoansPage />);

      await user.type(screen.getByLabelText(/利用者ID/), 'user-1');
      await user.type(screen.getByLabelText(/蔵書コピーID/), 'copy-1');
      await user.click(screen.getByRole('button', { name: '貸出処理を実行' }));

      await waitFor(() => {
        expect(screen.getByText(/利用者が見つかりません/)).toBeInTheDocument();
      });
    });
  });

  describe('返却処理フォーム', () => {
    it('返却タブをクリックすると返却フォームが表示される', async () => {
      const user = userEvent.setup();
      render(<LoansPage />);

      await user.click(screen.getByRole('tab', { name: '返却処理' }));

      expect(screen.getByLabelText(/貸出ID/)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: '返却処理を実行' })
      ).toBeInTheDocument();
    });

    it('返却処理が成功した場合、返却完了メッセージが表示される', async () => {
      vi.mocked(loanApi.returnBook).mockResolvedValue(mockReturnResult);

      const user = userEvent.setup();
      render(<LoansPage />);

      await user.click(screen.getByRole('tab', { name: '返却処理' }));
      await user.type(screen.getByLabelText(/貸出ID/), 'loan-1');
      await user.click(screen.getByRole('button', { name: '返却処理を実行' }));

      await waitFor(() => {
        expect(screen.getByText('返却完了')).toBeInTheDocument();
      });
    });

    it('延滞がある場合、延滞情報が表示される', async () => {
      vi.mocked(loanApi.returnBook).mockResolvedValue(mockOverdueReturnResult);

      const user = userEvent.setup();
      render(<LoansPage />);

      await user.click(screen.getByRole('tab', { name: '返却処理' }));
      await user.type(screen.getByLabelText(/貸出ID/), 'loan-2');
      await user.click(screen.getByRole('button', { name: '返却処理を実行' }));

      await waitFor(() => {
        expect(screen.getByText('返却完了')).toBeInTheDocument();
        expect(screen.getByText(/延滞日数: 25日/)).toBeInTheDocument();
      });
    });

    it('貸出IDが未入力の場合はバリデーションエラー', async () => {
      const user = userEvent.setup();
      render(<LoansPage />);

      await user.click(screen.getByRole('tab', { name: '返却処理' }));
      await user.click(screen.getByRole('button', { name: '返却処理を実行' }));

      await waitFor(() => {
        expect(screen.getByText(/貸出IDは必須です/)).toBeInTheDocument();
      });
    });

    it('貸出が見つからない場合、エラーメッセージが表示される', async () => {
      vi.mocked(loanApi.returnBook).mockRejectedValue(
        new ApiError(404, '貸出が見つかりません', {
          error: { type: 'LOAN_NOT_FOUND', loanId: 'loan-999' },
        })
      );

      const user = userEvent.setup();
      render(<LoansPage />);

      await user.click(screen.getByRole('tab', { name: '返却処理' }));
      await user.type(screen.getByLabelText(/貸出ID/), 'loan-999');
      await user.click(screen.getByRole('button', { name: '返却処理を実行' }));

      await waitFor(() => {
        expect(screen.getByText(/貸出が見つかりません/)).toBeInTheDocument();
      });
    });

    it('既に返却済みの場合、エラーメッセージが表示される', async () => {
      vi.mocked(loanApi.returnBook).mockRejectedValue(
        new ApiError(409, 'この貸出は既に返却されています', {
          error: { type: 'ALREADY_RETURNED', loanId: 'loan-1' },
        })
      );

      const user = userEvent.setup();
      render(<LoansPage />);

      await user.click(screen.getByRole('tab', { name: '返却処理' }));
      await user.type(screen.getByLabelText(/貸出ID/), 'loan-1');
      await user.click(screen.getByRole('button', { name: '返却処理を実行' }));

      await waitFor(() => {
        expect(
          screen.getByText(/この貸出は既に返却されています/)
        ).toBeInTheDocument();
      });
    });
  });

  describe('アクセシビリティ', () => {
    it('タブパネルが正しいaria属性を持つ', () => {
      render(<LoansPage />);

      const loanTab = screen.getByRole('tab', { name: '貸出処理' });
      const returnTab = screen.getByRole('tab', { name: '返却処理' });

      expect(loanTab).toHaveAttribute('aria-controls');
      expect(returnTab).toHaveAttribute('aria-controls');
    });

    it('フォーム入力フィールドにラベルが関連付けられている', () => {
      render(<LoansPage />);

      expect(screen.getByLabelText(/利用者ID/)).toBeInTheDocument();
      expect(screen.getByLabelText(/蔵書コピーID/)).toBeInTheDocument();
    });
  });
});
