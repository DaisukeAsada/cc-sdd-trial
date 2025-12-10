/**
 * ReservationsPage テスト
 *
 * 予約画面のテスト
 * - 予約リクエストフォーム
 * - 予約状況一覧
 * - 予約キャンセル機能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReservationsPage } from './ReservationsPage';
import * as reservationApi from '../lib/reservation-api';
import type { Reservation } from '../lib/reservation-api';
import { ApiError } from '../lib/api-client';

// API モック
vi.mock('../lib/reservation-api');

// ============================================
// テストデータ
// ============================================

const mockReservation: Reservation = {
  id: 'reservation-1',
  userId: 'user-1',
  bookId: 'book-1',
  reservedAt: '2024-12-10T10:00:00.000Z',
  notifiedAt: null,
  expiresAt: null,
  status: 'PENDING',
  queuePosition: 1,
};

const mockReservations: Reservation[] = [
  {
    id: 'reservation-1',
    userId: 'user-1',
    bookId: 'book-1',
    reservedAt: '2024-12-10T10:00:00.000Z',
    notifiedAt: null,
    expiresAt: null,
    status: 'PENDING',
    queuePosition: 1,
  },
  {
    id: 'reservation-2',
    userId: 'user-1',
    bookId: 'book-2',
    reservedAt: '2024-12-09T10:00:00.000Z',
    notifiedAt: '2024-12-10T08:00:00.000Z',
    expiresAt: '2024-12-17T08:00:00.000Z',
    status: 'NOTIFIED',
    queuePosition: 1,
  },
  {
    id: 'reservation-3',
    userId: 'user-1',
    bookId: 'book-3',
    reservedAt: '2024-12-08T10:00:00.000Z',
    notifiedAt: null,
    expiresAt: null,
    status: 'CANCELLED',
    queuePosition: 0,
  },
];

describe('ReservationsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('画面表示', () => {
    it('ページタイトルが表示される', () => {
      render(<ReservationsPage />);

      expect(
        screen.getByRole('heading', { name: '予約管理' })
      ).toBeInTheDocument();
    });

    it('予約作成タブと予約一覧タブが表示される', () => {
      render(<ReservationsPage />);

      expect(screen.getByRole('tab', { name: '予約作成' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: '予約一覧' })).toBeInTheDocument();
    });

    it('初期表示では予約作成タブが選択されている', () => {
      render(<ReservationsPage />);

      const createTab = screen.getByRole('tab', { name: '予約作成' });
      expect(createTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('予約作成フォーム', () => {
    it('予約フォームが表示される', () => {
      render(<ReservationsPage />);

      expect(screen.getByLabelText(/利用者ID/)).toBeInTheDocument();
      expect(screen.getByLabelText(/書籍ID/)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: '予約を作成' })
      ).toBeInTheDocument();
    });

    it('必須項目が未入力の場合はバリデーションエラー', async () => {
      const user = userEvent.setup();
      render(<ReservationsPage />);

      await user.click(screen.getByRole('button', { name: '予約を作成' }));

      await waitFor(() => {
        expect(screen.getByText(/利用者IDは必須です/)).toBeInTheDocument();
        expect(screen.getByText(/書籍IDは必須です/)).toBeInTheDocument();
      });
    });

    it('予約が成功した場合、成功メッセージが表示される', async () => {
      vi.mocked(reservationApi.createReservation).mockResolvedValue(
        mockReservation
      );

      const user = userEvent.setup();
      render(<ReservationsPage />);

      await user.type(screen.getByLabelText(/利用者ID/), 'user-1');
      await user.type(screen.getByLabelText(/書籍ID/), 'book-1');
      await user.click(screen.getByRole('button', { name: '予約を作成' }));

      await waitFor(() => {
        expect(screen.getByText(/予約が完了しました/)).toBeInTheDocument();
      });
    });

    it('予約成功後、フォームがクリアされる', async () => {
      vi.mocked(reservationApi.createReservation).mockResolvedValue(
        mockReservation
      );

      const user = userEvent.setup();
      render(<ReservationsPage />);

      const userIdInput = screen.getByLabelText(/利用者ID/);
      const bookIdInput = screen.getByLabelText(/書籍ID/);

      await user.type(userIdInput, 'user-1');
      await user.type(bookIdInput, 'book-1');
      await user.click(screen.getByRole('button', { name: '予約を作成' }));

      await waitFor(() => {
        expect(userIdInput).toHaveValue('');
        expect(bookIdInput).toHaveValue('');
      });
    });

    it('既に予約済みの場合、エラーメッセージが表示される', async () => {
      vi.mocked(reservationApi.createReservation).mockRejectedValue(
        new ApiError(409, 'この書籍は既に予約されています', {
          error: {
            type: 'ALREADY_RESERVED',
            userId: 'user-1',
            bookId: 'book-1',
          },
        })
      );

      const user = userEvent.setup();
      render(<ReservationsPage />);

      await user.type(screen.getByLabelText(/利用者ID/), 'user-1');
      await user.type(screen.getByLabelText(/書籍ID/), 'book-1');
      await user.click(screen.getByRole('button', { name: '予約を作成' }));

      await waitFor(() => {
        expect(
          screen.getByText(/この書籍は既に予約されています/)
        ).toBeInTheDocument();
      });
    });

    it('書籍が貸出可能な場合、エラーメッセージが表示される', async () => {
      vi.mocked(reservationApi.createReservation).mockRejectedValue(
        new ApiError(409, 'この書籍は現在貸出可能です。予約の必要はありません。', {
          error: { type: 'BOOK_AVAILABLE', bookId: 'book-1' },
        })
      );

      const user = userEvent.setup();
      render(<ReservationsPage />);

      await user.type(screen.getByLabelText(/利用者ID/), 'user-1');
      await user.type(screen.getByLabelText(/書籍ID/), 'book-1');
      await user.click(screen.getByRole('button', { name: '予約を作成' }));

      await waitFor(() => {
        expect(
          screen.getByText(/この書籍は現在貸出可能です/)
        ).toBeInTheDocument();
      });
    });

    it('書籍が見つからない場合、エラーメッセージが表示される', async () => {
      vi.mocked(reservationApi.createReservation).mockRejectedValue(
        new ApiError(404, '書籍が見つかりません', {
          error: { type: 'BOOK_NOT_FOUND', bookId: 'book-1' },
        })
      );

      const user = userEvent.setup();
      render(<ReservationsPage />);

      await user.type(screen.getByLabelText(/利用者ID/), 'user-1');
      await user.type(screen.getByLabelText(/書籍ID/), 'book-1');
      await user.click(screen.getByRole('button', { name: '予約を作成' }));

      await waitFor(() => {
        expect(screen.getByText(/書籍が見つかりません/)).toBeInTheDocument();
      });
    });

    it('利用者が見つからない場合、エラーメッセージが表示される', async () => {
      vi.mocked(reservationApi.createReservation).mockRejectedValue(
        new ApiError(404, '利用者が見つかりません', {
          error: { type: 'USER_NOT_FOUND', userId: 'user-1' },
        })
      );

      const user = userEvent.setup();
      render(<ReservationsPage />);

      await user.type(screen.getByLabelText(/利用者ID/), 'user-1');
      await user.type(screen.getByLabelText(/書籍ID/), 'book-1');
      await user.click(screen.getByRole('button', { name: '予約を作成' }));

      await waitFor(() => {
        expect(
          screen.getByText(/利用者が見つかりません/)
        ).toBeInTheDocument();
      });
    });
  });

  describe('予約一覧', () => {
    it('予約一覧タブをクリックすると検索フォームが表示される', async () => {
      const user = userEvent.setup();
      render(<ReservationsPage />);

      await user.click(screen.getByRole('tab', { name: '予約一覧' }));

      expect(screen.getByLabelText(/利用者ID/)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: '予約を検索' })
      ).toBeInTheDocument();
    });

    it('利用者IDで予約を検索できる', async () => {
      vi.mocked(reservationApi.getUserReservations).mockResolvedValue(
        mockReservations
      );

      const user = userEvent.setup();
      render(<ReservationsPage />);

      await user.click(screen.getByRole('tab', { name: '予約一覧' }));
      await user.type(screen.getByLabelText(/利用者ID/), 'user-1');
      await user.click(screen.getByRole('button', { name: '予約を検索' }));

      await waitFor(() => {
        expect(reservationApi.getUserReservations).toHaveBeenCalledWith(
          'user-1'
        );
      });
    });

    it('予約一覧が表示される', async () => {
      vi.mocked(reservationApi.getUserReservations).mockResolvedValue(
        mockReservations
      );

      const user = userEvent.setup();
      render(<ReservationsPage />);

      await user.click(screen.getByRole('tab', { name: '予約一覧' }));
      await user.type(screen.getByLabelText(/利用者ID/), 'user-1');
      await user.click(screen.getByRole('button', { name: '予約を検索' }));

      await waitFor(() => {
        expect(screen.getByText('book-1')).toBeInTheDocument();
        expect(screen.getByText('book-2')).toBeInTheDocument();
        expect(screen.getByText('book-3')).toBeInTheDocument();
      });
    });

    it('予約ステータスが表示される', async () => {
      vi.mocked(reservationApi.getUserReservations).mockResolvedValue(
        mockReservations
      );

      const user = userEvent.setup();
      render(<ReservationsPage />);

      await user.click(screen.getByRole('tab', { name: '予約一覧' }));
      await user.type(screen.getByLabelText(/利用者ID/), 'user-1');
      await user.click(screen.getByRole('button', { name: '予約を検索' }));

      await waitFor(() => {
        expect(screen.getByText('予約待ち')).toBeInTheDocument();
        expect(screen.getByText('通知済み')).toBeInTheDocument();
        // キャンセルはボタンとステータス両方に存在するため、getAllByTextを使用
        const cancelTexts = screen.getAllByText('キャンセル');
        // 少なくとも1つはステータス表示のセル
        expect(
          cancelTexts.some((el) => el.tagName.toLowerCase() === 'td')
        ).toBe(true);
      });
    });

    it('予約がない場合はメッセージが表示される', async () => {
      vi.mocked(reservationApi.getUserReservations).mockResolvedValue([]);

      const user = userEvent.setup();
      render(<ReservationsPage />);

      await user.click(screen.getByRole('tab', { name: '予約一覧' }));
      await user.type(screen.getByLabelText(/利用者ID/), 'user-1');
      await user.click(screen.getByRole('button', { name: '予約を検索' }));

      await waitFor(() => {
        expect(screen.getByText(/予約はありません/)).toBeInTheDocument();
      });
    });

    it('検索エラー時にエラーメッセージが表示される', async () => {
      vi.mocked(reservationApi.getUserReservations).mockRejectedValue(
        new ApiError(500, 'サーバーエラー')
      );

      const user = userEvent.setup();
      render(<ReservationsPage />);

      await user.click(screen.getByRole('tab', { name: '予約一覧' }));
      await user.type(screen.getByLabelText(/利用者ID/), 'user-1');
      await user.click(screen.getByRole('button', { name: '予約を検索' }));

      await waitFor(() => {
        expect(screen.getByText(/サーバーエラー/)).toBeInTheDocument();
      });
    });
  });

  describe('予約キャンセル', () => {
    it('キャンセルボタンをクリックすると確認ダイアログが表示される', async () => {
      vi.mocked(reservationApi.getUserReservations).mockResolvedValue([
        mockReservations[0],
      ]);

      const user = userEvent.setup();
      render(<ReservationsPage />);

      await user.click(screen.getByRole('tab', { name: '予約一覧' }));
      await user.type(screen.getByLabelText(/利用者ID/), 'user-1');
      await user.click(screen.getByRole('button', { name: '予約を検索' }));

      await waitFor(() => {
        expect(screen.getByText('book-1')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'キャンセル' }));

      await waitFor(() => {
        expect(
          screen.getByText(/この予約をキャンセルしますか？/)
        ).toBeInTheDocument();
      });
    });

    it('キャンセル確認後、予約がキャンセルされる', async () => {
      vi.mocked(reservationApi.getUserReservations).mockResolvedValue([
        mockReservations[0],
      ]);
      vi.mocked(reservationApi.cancelReservation).mockResolvedValue(undefined);

      const user = userEvent.setup();
      render(<ReservationsPage />);

      await user.click(screen.getByRole('tab', { name: '予約一覧' }));
      await user.type(screen.getByLabelText(/利用者ID/), 'user-1');
      await user.click(screen.getByRole('button', { name: '予約を検索' }));

      await waitFor(() => {
        expect(screen.getByText('book-1')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'キャンセル' }));

      await waitFor(() => {
        expect(
          screen.getByText(/この予約をキャンセルしますか？/)
        ).toBeInTheDocument();
      });

      // 確認ダイアログで確定
      const dialog = screen.getByRole('dialog');
      await user.click(within(dialog).getByRole('button', { name: '確定' }));

      await waitFor(() => {
        expect(reservationApi.cancelReservation).toHaveBeenCalledWith(
          'reservation-1'
        );
        expect(
          screen.getByText(/予約をキャンセルしました/)
        ).toBeInTheDocument();
      });
    });

    it('確認ダイアログでキャンセルすると予約はキャンセルされない', async () => {
      vi.mocked(reservationApi.getUserReservations).mockResolvedValue([
        mockReservations[0],
      ]);

      const user = userEvent.setup();
      render(<ReservationsPage />);

      await user.click(screen.getByRole('tab', { name: '予約一覧' }));
      await user.type(screen.getByLabelText(/利用者ID/), 'user-1');
      await user.click(screen.getByRole('button', { name: '予約を検索' }));

      await waitFor(() => {
        expect(screen.getByText('book-1')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'キャンセル' }));

      await waitFor(() => {
        expect(
          screen.getByText(/この予約をキャンセルしますか？/)
        ).toBeInTheDocument();
      });

      // 確認ダイアログでキャンセル
      const dialog = screen.getByRole('dialog');
      const cancelButton = within(dialog).getByRole('button', {
        name: /^キャンセル$/,
      });
      await user.click(cancelButton);

      expect(reservationApi.cancelReservation).not.toHaveBeenCalled();
    });

    it('キャンセルエラー時にエラーメッセージが表示される', async () => {
      vi.mocked(reservationApi.getUserReservations).mockResolvedValue([
        mockReservations[0],
      ]);
      vi.mocked(reservationApi.cancelReservation).mockRejectedValue(
        new ApiError(404, '予約が見つかりません', {
          error: { type: 'RESERVATION_NOT_FOUND', reservationId: 'reservation-1' },
        })
      );

      const user = userEvent.setup();
      render(<ReservationsPage />);

      await user.click(screen.getByRole('tab', { name: '予約一覧' }));
      await user.type(screen.getByLabelText(/利用者ID/), 'user-1');
      await user.click(screen.getByRole('button', { name: '予約を検索' }));

      await waitFor(() => {
        expect(screen.getByText('book-1')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'キャンセル' }));

      await waitFor(() => {
        expect(
          screen.getByText(/この予約をキャンセルしますか？/)
        ).toBeInTheDocument();
      });

      const dialog = screen.getByRole('dialog');
      await user.click(within(dialog).getByRole('button', { name: '確定' }));

      await waitFor(() => {
        expect(screen.getByText(/予約が見つかりません/)).toBeInTheDocument();
      });
    });

    it('キャンセル済みの予約にはキャンセルボタンが表示されない', async () => {
      vi.mocked(reservationApi.getUserReservations).mockResolvedValue([
        mockReservations[2], // CANCELLED status
      ]);

      const user = userEvent.setup();
      render(<ReservationsPage />);

      await user.click(screen.getByRole('tab', { name: '予約一覧' }));
      await user.type(screen.getByLabelText(/利用者ID/), 'user-1');
      await user.click(screen.getByRole('button', { name: '予約を検索' }));

      await waitFor(() => {
        expect(screen.getByText('book-3')).toBeInTheDocument();
      });

      expect(
        screen.queryByRole('button', { name: 'キャンセル' })
      ).not.toBeInTheDocument();
    });
  });
});
