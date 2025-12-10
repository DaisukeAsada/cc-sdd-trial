import React, { useState, useCallback, type FormEvent } from 'react';
import { FormInput, Alert, DataTable, ConfirmDialog, type Column } from '../components';
import {
  createReservation,
  cancelReservation,
  getUserReservations,
  type Reservation,
  type ReservationStatus,
} from '../lib/reservation-api';
import { ApiError } from '../lib/api-client';

// ============================================
// 型定義
// ============================================

/** タブ種別 */
type TabType = 'create' | 'list';

/** アラート情報 */
interface AlertInfo {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

/** フォームバリデーションエラー */
interface ValidationErrors {
  userId?: string;
  bookId?: string;
}

// ============================================
// ステータス表示用マッピング
// ============================================

const statusLabels: Record<ReservationStatus, string> = {
  PENDING: '予約待ち',
  NOTIFIED: '通知済み',
  FULFILLED: '貸出完了',
  EXPIRED: '期限切れ',
  CANCELLED: 'キャンセル',
};

// ============================================
// ヘルパー関数
// ============================================

/**
 * 日付をフォーマット
 */
function formatDate(dateString: string | null): string {
  if (dateString === null) {
    return '-';
  }
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * キャンセル可能なステータスか判定
 */
function isCancellable(status: ReservationStatus): boolean {
  return status === 'PENDING' || status === 'NOTIFIED';
}

// ============================================
// メインコンポーネント
// ============================================

/**
 * 予約管理ページ
 */
export function ReservationsPage(): React.ReactElement {
  // タブ状態
  const [activeTab, setActiveTab] = useState<TabType>('create');

  // 予約作成フォーム状態
  const [createUserId, setCreateUserId] = useState('');
  const [createBookId, setCreateBookId] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // 予約一覧状態
  const [searchUserId, setSearchUserId] = useState('');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // キャンセル確認ダイアログ状態
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // 共通状態
  const [alert, setAlert] = useState<AlertInfo | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // ============================================
  // 予約作成処理
  // ============================================

  const validateCreateForm = useCallback((): boolean => {
    const errors: ValidationErrors = {};

    if (createUserId.trim() === '') {
      errors.userId = '利用者IDは必須です';
    }
    if (createBookId.trim() === '') {
      errors.bookId = '書籍IDは必須です';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [createUserId, createBookId]);

  const handleCreateSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setAlert(null);

      if (!validateCreateForm()) {
        return;
      }

      setCreateLoading(true);

      try {
        await createReservation({
          userId: createUserId.trim(),
          bookId: createBookId.trim(),
        });
        setAlert({
          message: '予約が完了しました',
          type: 'success',
        });
        setCreateUserId('');
        setCreateBookId('');
        setValidationErrors({});
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
        setCreateLoading(false);
      }
    },
    [createUserId, createBookId, validateCreateForm]
  );

  // ============================================
  // 予約検索処理
  // ============================================

  const validateSearchForm = useCallback((): boolean => {
    const errors: ValidationErrors = {};

    if (searchUserId.trim() === '') {
      errors.userId = '利用者IDは必須です';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [searchUserId]);

  const handleSearchSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setAlert(null);

      if (!validateSearchForm()) {
        return;
      }

      setSearchLoading(true);

      try {
        const result = await getUserReservations(searchUserId.trim());
        setReservations(result);
        setHasSearched(true);
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
        setSearchLoading(false);
      }
    },
    [searchUserId, validateSearchForm]
  );

  // ============================================
  // 予約キャンセル処理
  // ============================================

  const handleCancelClick = useCallback((reservation: Reservation) => {
    setCancelTarget(reservation);
  }, []);

  const handleCancelConfirm = useCallback(async () => {
    if (cancelTarget === null) {
      return;
    }

    setCancelLoading(true);

    try {
      await cancelReservation(cancelTarget.id);
      setAlert({
        message: '予約をキャンセルしました',
        type: 'success',
      });
      // 予約一覧から削除
      setReservations((prev) =>
        prev.filter((r) => r.id !== cancelTarget.id)
      );
      setCancelTarget(null);
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
      setCancelTarget(null);
    } finally {
      setCancelLoading(false);
    }
  }, [cancelTarget]);

  const handleCancelDialogClose = useCallback(() => {
    setCancelTarget(null);
  }, []);

  // ============================================
  // タブ切り替え
  // ============================================

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    setAlert(null);
    setValidationErrors({});
  }, []);

  const handleAlertClose = useCallback(() => {
    setAlert(null);
  }, []);

  // ============================================
  // テーブルカラム定義
  // ============================================

  const columns: Column<Reservation>[] = [
    { key: 'bookId', header: '書籍ID' },
    {
      key: 'reservedAt',
      header: '予約日',
      render: (r) => formatDate(r.reservedAt),
    },
    {
      key: 'status',
      header: 'ステータス',
      render: (r) => statusLabels[r.status],
    },
    {
      key: 'queuePosition',
      header: '順番',
      render: (r) => (r.queuePosition > 0 ? String(r.queuePosition) : '-'),
    },
    {
      key: 'expiresAt',
      header: '有効期限',
      render: (r) => formatDate(r.expiresAt),
    },
    {
      key: 'actions',
      header: '操作',
      render: (r) =>
        isCancellable(r.status) ? (
          <button
            type="button"
            className="cancel-button"
            onClick={() => handleCancelClick(r)}
          >
            キャンセル
          </button>
        ) : null,
    },
  ];

  // ============================================
  // レンダリング
  // ============================================

  return (
    <div data-testid="reservations-page" className="reservations-page">
      <h1>予約管理</h1>

      {/* タブナビゲーション */}
      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          id="tab-create"
          aria-selected={activeTab === 'create'}
          aria-controls="panel-create"
          className={`tab ${activeTab === 'create' ? 'tab-active' : ''}`}
          onClick={() => handleTabChange('create')}
        >
          予約作成
        </button>
        <button
          type="button"
          role="tab"
          id="tab-list"
          aria-selected={activeTab === 'list'}
          aria-controls="panel-list"
          className={`tab ${activeTab === 'list' ? 'tab-active' : ''}`}
          onClick={() => handleTabChange('list')}
        >
          予約一覧
        </button>
      </div>

      {/* アラート */}
      {alert !== null && (
        <Alert
          message={alert.message}
          type={alert.type}
          onClose={handleAlertClose}
        />
      )}

      {/* 予約作成パネル */}
      {activeTab === 'create' && (
        <div
          role="tabpanel"
          id="panel-create"
          aria-labelledby="tab-create"
          className="tab-panel"
        >
          <form onSubmit={handleCreateSubmit} className="create-form" noValidate>
            <FormInput
              id="createUserId"
              label="利用者ID"
              value={createUserId}
              onChange={setCreateUserId}
              required
              error={validationErrors.userId}
              disabled={createLoading}
            />
            <FormInput
              id="createBookId"
              label="書籍ID"
              value={createBookId}
              onChange={setCreateBookId}
              required
              error={validationErrors.bookId}
              disabled={createLoading}
            />
            <button
              type="submit"
              className="submit-button"
              disabled={createLoading}
            >
              {createLoading ? '処理中...' : '予約を作成'}
            </button>
          </form>
        </div>
      )}

      {/* 予約一覧パネル */}
      {activeTab === 'list' && (
        <div
          role="tabpanel"
          id="panel-list"
          aria-labelledby="tab-list"
          className="tab-panel"
        >
          <form onSubmit={handleSearchSubmit} className="search-form" noValidate>
            <FormInput
              id="searchUserId"
              label="利用者ID"
              value={searchUserId}
              onChange={setSearchUserId}
              required
              error={validationErrors.userId}
              disabled={searchLoading}
            />
            <button
              type="submit"
              className="submit-button"
              disabled={searchLoading}
            >
              {searchLoading ? '検索中...' : '予約を検索'}
            </button>
          </form>

          {hasSearched && reservations.length === 0 && (
            <p className="no-data">予約はありません</p>
          )}

          {reservations.length > 0 && (
            <DataTable
              data={reservations}
              columns={columns}
              keyField="id"
            />
          )}
        </div>
      )}

      {/* キャンセル確認ダイアログ */}
      <ConfirmDialog
        isOpen={cancelTarget !== null}
        title="予約キャンセル確認"
        message="この予約をキャンセルしますか？"
        confirmLabel="確定"
        cancelLabel="キャンセル"
        onConfirm={handleCancelConfirm}
        onCancel={handleCancelDialogClose}
        variant="danger"
        loading={cancelLoading}
      />
    </div>
  );
}
