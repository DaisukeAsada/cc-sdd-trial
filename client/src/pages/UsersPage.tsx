import React, { useState, useCallback, type FormEvent } from 'react';
import { FormInput, Alert, DataTable, type Column } from '../components';
import {
  createUser,
  searchUsers,
  getUserLoans,
  type User,
  type UserWithLoans,
  type LoanSummary,
} from '../lib/user-api';
import { ApiError } from '../lib/api-client';

// ============================================
// 型定義
// ============================================

/** タブ種別 */
type TabType = 'search' | 'register';

/** アラート情報 */
interface AlertInfo {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

/** 登録フォームデータ */
interface RegisterFormData {
  name: string;
  email: string;
  address: string;
  phone: string;
  loanLimit: string;
}

/** フォームバリデーションエラー */
interface ValidationErrors {
  name?: string;
  email?: string;
  address?: string;
  phone?: string;
  loanLimit?: string;
}

// ============================================
// 初期値
// ============================================

const initialFormData: RegisterFormData = {
  name: '',
  email: '',
  address: '',
  phone: '',
  loanLimit: '5',
};

// ============================================
// ヘルパー関数
// ============================================

/**
 * 日付をフォーマット
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ============================================
// カラム定義
// ============================================

const createUserColumns = (
  onSelect: (user: User) => void
): Column<User>[] => [
  {
    key: 'name',
    header: '氏名',
    sortable: true,
    render: (user) => (
      <button
        type="button"
        className="users-page-link-button"
        onClick={() => {
          onSelect(user);
        }}
      >
        {user.name}
      </button>
    ),
  },
  { key: 'email', header: 'メールアドレス' },
  { key: 'phone', header: '電話番号', render: (user) => user.phone ?? '-' },
  {
    key: 'loanLimit',
    header: '貸出上限',
    render: (user) => String(user.loanLimit),
  },
];

const loanColumns: Column<LoanSummary>[] = [
  { key: 'bookTitle', header: '書籍名' },
  {
    key: 'borrowedAt',
    header: '貸出日',
    render: (loan) => formatDate(loan.borrowedAt),
  },
  {
    key: 'dueDate',
    header: '返却期限',
    render: (loan) => formatDate(loan.dueDate),
  },
  {
    key: 'returnedAt',
    header: '返却日',
    render: (loan) => (loan.returnedAt !== null ? formatDate(loan.returnedAt) : '-'),
  },
  {
    key: 'isOverdue',
    header: '延滞',
    render: (loan) => (loan.isOverdue ? '延滞あり' : '-'),
  },
];

// ============================================
// サブコンポーネント
// ============================================

/**
 * 利用者詳細表示コンポーネント
 */
function UserDetailDisplay({
  userWithLoans,
  onClose,
}: {
  readonly userWithLoans: UserWithLoans;
  readonly onClose: () => void;
}): React.ReactElement {
  const { user, currentLoans, loanHistory } = userWithLoans;

  return (
    <div className="user-detail" data-testid="user-detail">
      <div className="user-detail-header">
        <h3>利用者詳細</h3>
        <button type="button" className="close-button" onClick={onClose}>
          閉じる
        </button>
      </div>

      <section className="user-info-section">
        <h4>基本情報</h4>
        <dl className="user-info">
          <div className="info-row">
            <dt>氏名</dt>
            <dd>{user.name}</dd>
          </div>
          <div className="info-row">
            <dt>メールアドレス</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="info-row">
            <dt>住所</dt>
            <dd>{user.address ?? '-'}</dd>
          </div>
          <div className="info-row">
            <dt>電話番号</dt>
            <dd>{user.phone ?? '-'}</dd>
          </div>
          <div className="info-row">
            <dt>登録日</dt>
            <dd>{formatDate(user.registeredAt)}</dd>
          </div>
          <div className="info-row">
            <dt>貸出上限</dt>
            <dd>{user.loanLimit}冊</dd>
          </div>
        </dl>
      </section>

      <section className="current-loans-section">
        <h4>現在の貸出状況（{currentLoans.length}件）</h4>
        {currentLoans.length > 0 ? (
          <DataTable data={currentLoans} columns={loanColumns} keyField="id" />
        ) : (
          <p className="no-data">現在貸出中の書籍はありません</p>
        )}
      </section>

      <section className="loan-history-section">
        <h4>貸出履歴（{loanHistory.length}件）</h4>
        {loanHistory.length > 0 ? (
          <DataTable data={loanHistory} columns={loanColumns} keyField="id" />
        ) : (
          <p className="no-data">貸出履歴はありません</p>
        )}
      </section>
    </div>
  );
}

// ============================================
// メインコンポーネント
// ============================================

/**
 * 利用者管理ページ
 */
export function UsersPage(): React.ReactElement {
  // タブ状態
  const [activeTab, setActiveTab] = useState<TabType>('search');

  // 登録フォーム状態
  const [formData, setFormData] = useState<RegisterFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<ValidationErrors>({});
  const [registering, setRegistering] = useState(false);

  // 検索状態
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<readonly User[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // 詳細表示状態
  const [selectedUserWithLoans, setSelectedUserWithLoans] = useState<UserWithLoans | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // 共通状態
  const [alert, setAlert] = useState<AlertInfo | null>(null);

  // ============================================
  // 登録フォーム処理
  // ============================================

  const handleFormChange = useCallback(
    (field: keyof RegisterFormData) => (value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    },
    []
  );

  const validateForm = useCallback((): boolean => {
    const errors: ValidationErrors = {};

    if (formData.name.trim() === '') {
      errors.name = '氏名は必須です';
    }
    if (formData.email.trim() === '') {
      errors.email = 'メールアドレスは必須です';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const handleRegisterSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setAlert(null);

      if (!validateForm()) {
        return;
      }

      setRegistering(true);

      try {
        await createUser({
          name: formData.name.trim(),
          email: formData.email.trim(),
          address: formData.address.trim() !== '' ? formData.address.trim() : null,
          phone: formData.phone.trim() !== '' ? formData.phone.trim() : null,
          loanLimit: formData.loanLimit !== '' ? parseInt(formData.loanLimit, 10) : undefined,
        });
        setFormData(initialFormData);
        setFormErrors({});
        setAlert({
          message: '利用者を登録しました',
          type: 'success',
        });
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
        setRegistering(false);
      }
    },
    [formData, validateForm]
  );

  // ============================================
  // 検索処理
  // ============================================

  const handleSearch = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setAlert(null);
      setSelectedUserWithLoans(null);
      setSearching(true);
      setHasSearched(true);

      try {
        const keyword = searchKeyword.trim();
        const results = await searchUsers(
          keyword !== '' ? { name: keyword } : {}
        );
        setSearchResults(results);
      } catch (error) {
        if (error instanceof ApiError) {
          setAlert({
            message: error.message,
            type: 'error',
          });
        } else {
          setAlert({
            message: '検索中にエラーが発生しました',
            type: 'error',
          });
        }
      } finally {
        setSearching(false);
      }
    },
    [searchKeyword]
  );

  // ============================================
  // 詳細表示処理
  // ============================================

  const handleSelectUser = useCallback(async (user: User) => {
    setLoadingDetail(true);
    setAlert(null);

    try {
      const userWithLoans = await getUserLoans(user.id);
      setSelectedUserWithLoans(userWithLoans);
    } catch (error) {
      if (error instanceof ApiError) {
        setAlert({
          message: error.message,
          type: 'error',
        });
      } else {
        setAlert({
          message: '詳細の取得中にエラーが発生しました',
          type: 'error',
        });
      }
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedUserWithLoans(null);
  }, []);

  // ============================================
  // レンダリング
  // ============================================

  return (
    <div className="users-page" data-testid="users-page">
      <h1>利用者管理</h1>

      {/* アラート */}
      {alert !== null && (
        <Alert
          message={alert.message}
          type={alert.type}
          onClose={() => {
            setAlert(null);
          }}
        />
      )}

      {/* タブ */}
      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'search'}
          className={`tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('search');
          }}
        >
          利用者検索
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'register'}
          className={`tab ${activeTab === 'register' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('register');
          }}
        >
          利用者登録
        </button>
      </div>

      {/* タブパネル */}
      <div className="tab-panel">
        {activeTab === 'search' && (
          <div className="search-panel">
            {/* 検索フォーム */}
            <form onSubmit={handleSearch} className="search-form">
              <FormInput
                id="search-keyword"
                label="検索キーワード"
                value={searchKeyword}
                onChange={setSearchKeyword}
                placeholder="氏名で検索"
              />
              <button type="submit" disabled={searching}>
                {searching ? '検索中...' : '検索'}
              </button>
            </form>

            {/* 検索結果 */}
            {hasSearched && (
              <div className="search-results">
                {searchResults.length > 0 ? (
                  <DataTable
                    data={searchResults}
                    columns={createUserColumns(handleSelectUser)}
                    keyField="id"
                  />
                ) : (
                  <p className="no-results">該当する利用者が見つかりません</p>
                )}
              </div>
            )}

            {/* 詳細表示 */}
            {loadingDetail && <p>読み込み中...</p>}
            {selectedUserWithLoans !== null && (
              <UserDetailDisplay
                userWithLoans={selectedUserWithLoans}
                onClose={handleCloseDetail}
              />
            )}
          </div>
        )}

        {activeTab === 'register' && (
          <div className="register-panel">
            <form onSubmit={handleRegisterSubmit} className="register-form">
              <FormInput
                id="name"
                label="氏名"
                value={formData.name}
                onChange={handleFormChange('name')}
                error={formErrors.name}
                required
              />
              <FormInput
                id="email"
                label="メールアドレス"
                type="email"
                value={formData.email}
                onChange={handleFormChange('email')}
                error={formErrors.email}
                required
              />
              <FormInput
                id="address"
                label="住所"
                value={formData.address}
                onChange={handleFormChange('address')}
                error={formErrors.address}
              />
              <FormInput
                id="phone"
                label="電話番号"
                type="tel"
                value={formData.phone}
                onChange={handleFormChange('phone')}
                error={formErrors.phone}
              />
              <FormInput
                id="loanLimit"
                label="貸出上限"
                type="number"
                value={formData.loanLimit}
                onChange={handleFormChange('loanLimit')}
                error={formErrors.loanLimit}
              />
              <button type="submit" disabled={registering}>
                {registering ? '登録中...' : '登録する'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
