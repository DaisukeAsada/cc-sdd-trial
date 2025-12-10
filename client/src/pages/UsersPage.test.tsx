/**
 * UsersPage テスト
 *
 * 利用者管理画面のテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UsersPage } from './UsersPage';
import * as userApi from '../lib/user-api';
import type { User, UserWithLoans } from '../lib/user-api';
import { ApiError } from '../lib/api-client';

// API モック
vi.mock('../lib/user-api');

const mockUser: User = {
  id: 'user-1',
  name: '山田太郎',
  address: '東京都渋谷区1-2-3',
  email: 'yamada@example.com',
  phone: '03-1234-5678',
  registeredAt: '2024-12-10T10:00:00.000Z',
  loanLimit: 5,
};

const mockUser2: User = {
  id: 'user-2',
  name: '佐藤花子',
  address: '大阪府大阪市1-2-3',
  email: 'sato@example.com',
  phone: '06-1234-5678',
  registeredAt: '2024-12-11T10:00:00.000Z',
  loanLimit: 3,
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

describe('UsersPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('画面表示', () => {
    it('ページタイトルが表示される', () => {
      render(<UsersPage />);

      expect(
        screen.getByRole('heading', { name: '利用者管理' })
      ).toBeInTheDocument();
    });

    it('利用者登録タブと検索タブが表示される', () => {
      render(<UsersPage />);

      expect(screen.getByRole('tab', { name: '利用者登録' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: '利用者検索' })).toBeInTheDocument();
    });

    it('初期表示では検索タブが選択されている', () => {
      render(<UsersPage />);

      const searchTab = screen.getByRole('tab', { name: '利用者検索' });
      expect(searchTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('利用者登録フォーム', () => {
    it('登録タブをクリックすると登録フォームが表示される', async () => {
      const user = userEvent.setup();
      render(<UsersPage />);

      await user.click(screen.getByRole('tab', { name: '利用者登録' }));

      expect(screen.getByLabelText(/氏名/)).toBeInTheDocument();
      expect(screen.getByLabelText(/メールアドレス/)).toBeInTheDocument();
      expect(screen.getByLabelText(/住所/)).toBeInTheDocument();
      expect(screen.getByLabelText(/電話番号/)).toBeInTheDocument();
      expect(screen.getByLabelText(/貸出上限/)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: '登録する' })
      ).toBeInTheDocument();
    });

    it('必須項目が未入力の場合はバリデーションエラー', async () => {
      const user = userEvent.setup();
      render(<UsersPage />);

      await user.click(screen.getByRole('tab', { name: '利用者登録' }));
      
      // required属性を削除することでネイティブバリデーションをバイパス
      const nameInput = screen.getByLabelText(/氏名/);
      const emailInput = screen.getByLabelText(/メールアドレス/);
      nameInput.removeAttribute('required');
      emailInput.removeAttribute('required');
      
      await user.click(screen.getByRole('button', { name: '登録する' }));

      await waitFor(() => {
        expect(screen.getByText(/氏名は必須です/)).toBeInTheDocument();
        expect(screen.getByText(/メールアドレスは必須です/)).toBeInTheDocument();
      });
    });

    it('利用者登録が成功した場合、成功メッセージが表示される', async () => {
      vi.mocked(userApi.createUser).mockResolvedValue(mockUser);

      const user = userEvent.setup();
      render(<UsersPage />);

      await user.click(screen.getByRole('tab', { name: '利用者登録' }));
      await user.type(screen.getByLabelText(/氏名/), '山田太郎');
      await user.type(screen.getByLabelText(/メールアドレス/), 'yamada@example.com');
      await user.type(screen.getByLabelText(/住所/), '東京都渋谷区1-2-3');
      await user.type(screen.getByLabelText(/電話番号/), '03-1234-5678');
      await user.click(screen.getByRole('button', { name: '登録する' }));

      await waitFor(() => {
        expect(screen.getByText(/利用者を登録しました/)).toBeInTheDocument();
      });
    });

    it('メール重複エラーの場合、エラーメッセージが表示される', async () => {
      vi.mocked(userApi.createUser).mockRejectedValue(
        new ApiError(409, 'このメールアドレスは既に登録されています', {
          error: { type: 'DUPLICATE_EMAIL', email: 'yamada@example.com' },
        })
      );

      const user = userEvent.setup();
      render(<UsersPage />);

      await user.click(screen.getByRole('tab', { name: '利用者登録' }));
      await user.type(screen.getByLabelText(/氏名/), '山田太郎');
      await user.type(screen.getByLabelText(/メールアドレス/), 'yamada@example.com');
      await user.click(screen.getByRole('button', { name: '登録する' }));

      await waitFor(() => {
        expect(
          screen.getByText(/このメールアドレスは既に登録されています/)
        ).toBeInTheDocument();
      });
    });
  });

  describe('利用者検索', () => {
    it('検索フォームが表示される', () => {
      render(<UsersPage />);

      expect(screen.getByLabelText(/検索キーワード/)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: '検索' })
      ).toBeInTheDocument();
    });

    it('検索結果が表示される', async () => {
      vi.mocked(userApi.searchUsers).mockResolvedValue([mockUser, mockUser2]);

      const user = userEvent.setup();
      render(<UsersPage />);

      await user.type(screen.getByLabelText(/検索キーワード/), '山田');
      await user.click(screen.getByRole('button', { name: '検索' }));

      await waitFor(() => {
        expect(screen.getByText('山田太郎')).toBeInTheDocument();
        expect(screen.getByText('佐藤花子')).toBeInTheDocument();
      });
    });

    it('検索結果が0件の場合、メッセージが表示される', async () => {
      vi.mocked(userApi.searchUsers).mockResolvedValue([]);

      const user = userEvent.setup();
      render(<UsersPage />);

      await user.type(screen.getByLabelText(/検索キーワード/), 'nonexistent');
      await user.click(screen.getByRole('button', { name: '検索' }));

      await waitFor(() => {
        expect(screen.getByText(/該当する利用者が見つかりません/)).toBeInTheDocument();
      });
    });
  });

  describe('利用者詳細', () => {
    it('利用者をクリックすると詳細情報が表示される', async () => {
      vi.mocked(userApi.searchUsers).mockResolvedValue([mockUser]);
      vi.mocked(userApi.getUserLoans).mockResolvedValue(mockUserWithLoans);

      const user = userEvent.setup();
      render(<UsersPage />);

      await user.type(screen.getByLabelText(/検索キーワード/), '山田');
      await user.click(screen.getByRole('button', { name: '検索' }));

      await waitFor(() => {
        expect(screen.getByText('山田太郎')).toBeInTheDocument();
      });

      await user.click(screen.getByText('山田太郎'));

      await waitFor(() => {
        const detailSection = screen.getByTestId('user-detail');
        expect(detailSection).toBeInTheDocument();
        expect(within(detailSection).getByText('yamada@example.com')).toBeInTheDocument();
        expect(within(detailSection).getByText('東京都渋谷区1-2-3')).toBeInTheDocument();
      });
    });

    it('利用者詳細に現在の貸出状況が表示される', async () => {
      vi.mocked(userApi.searchUsers).mockResolvedValue([mockUser]);
      vi.mocked(userApi.getUserLoans).mockResolvedValue(mockUserWithLoans);

      const user = userEvent.setup();
      render(<UsersPage />);

      await user.type(screen.getByLabelText(/検索キーワード/), '山田');
      await user.click(screen.getByRole('button', { name: '検索' }));

      await waitFor(() => {
        expect(screen.getByText('山田太郎')).toBeInTheDocument();
      });

      await user.click(screen.getByText('山田太郎'));

      await waitFor(() => {
        const detailSection = screen.getByTestId('user-detail');
        expect(within(detailSection).getByText('TypeScript入門')).toBeInTheDocument();
      });
    });

    it('利用者詳細に貸出履歴が表示される', async () => {
      vi.mocked(userApi.searchUsers).mockResolvedValue([mockUser]);
      vi.mocked(userApi.getUserLoans).mockResolvedValue(mockUserWithLoans);

      const user = userEvent.setup();
      render(<UsersPage />);

      await user.type(screen.getByLabelText(/検索キーワード/), '山田');
      await user.click(screen.getByRole('button', { name: '検索' }));

      await waitFor(() => {
        expect(screen.getByText('山田太郎')).toBeInTheDocument();
      });

      await user.click(screen.getByText('山田太郎'));

      await waitFor(() => {
        const detailSection = screen.getByTestId('user-detail');
        expect(within(detailSection).getByText('JavaScript入門')).toBeInTheDocument();
      });
    });

    it('詳細を閉じるボタンで詳細を閉じられる', async () => {
      vi.mocked(userApi.searchUsers).mockResolvedValue([mockUser]);
      vi.mocked(userApi.getUserLoans).mockResolvedValue(mockUserWithLoans);

      const user = userEvent.setup();
      render(<UsersPage />);

      await user.type(screen.getByLabelText(/検索キーワード/), '山田');
      await user.click(screen.getByRole('button', { name: '検索' }));

      await waitFor(() => {
        expect(screen.getByText('山田太郎')).toBeInTheDocument();
      });

      await user.click(screen.getByText('山田太郎'));

      await waitFor(() => {
        expect(screen.getByTestId('user-detail')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: '閉じる' }));

      await waitFor(() => {
        expect(screen.queryByTestId('user-detail')).not.toBeInTheDocument();
      });
    });
  });
});
