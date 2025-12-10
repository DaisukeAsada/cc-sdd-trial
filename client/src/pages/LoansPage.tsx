import React, { useState, useCallback, type FormEvent } from 'react';
import { FormInput, Alert } from '../components';
import { createLoan, returnBook, type LoanReceipt, type ReturnResult } from '../lib/loan-api';
import { ApiError } from '../lib/api-client';

// ============================================
// 型定義
// ============================================

/** タブ種別 */
type TabType = 'loan' | 'return';

/** アラート情報 */
interface AlertInfo {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

/** フォームバリデーションエラー */
interface ValidationErrors {
  userId?: string;
  bookCopyId?: string;
  loanId?: string;
}

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
// サブコンポーネント
// ============================================

/**
 * 貸出レシート表示コンポーネント
 */
function LoanReceiptDisplay({
  receipt,
}: {
  readonly receipt: LoanReceipt;
}): React.ReactElement {
  return (
    <div className="loan-receipt" data-testid="loan-receipt">
      <h3>貸出レシート</h3>
      <dl className="receipt-details">
        <div className="receipt-row">
          <dt>書籍名</dt>
          <dd>{receipt.bookTitle}</dd>
        </div>
        <div className="receipt-row">
          <dt>利用者名</dt>
          <dd>{receipt.userName}</dd>
        </div>
        <div className="receipt-row">
          <dt>貸出ID</dt>
          <dd>{receipt.loan.id}</dd>
        </div>
        <div className="receipt-row">
          <dt>貸出日</dt>
          <dd>{formatDate(receipt.loan.borrowedAt)}</dd>
        </div>
        <div className="receipt-row">
          <dt>返却期限</dt>
          <dd>{formatDate(receipt.loan.dueDate)}</dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * 返却結果表示コンポーネント
 */
function ReturnResultDisplay({
  result,
}: {
  readonly result: ReturnResult;
}): React.ReactElement {
  return (
    <div className="return-result" data-testid="return-result">
      <h3>返却完了</h3>
      <dl className="result-details">
        <div className="result-row">
          <dt>貸出ID</dt>
          <dd>{result.loan.id}</dd>
        </div>
        <div className="result-row">
          <dt>返却日</dt>
          <dd>{result.loan.returnedAt !== null ? formatDate(result.loan.returnedAt) : '-'}</dd>
        </div>
        {result.isOverdue && (
          <div className="result-row overdue-info">
            <dt>延滞</dt>
            <dd className="overdue-warning">延滞日数: {result.overdueDays}日</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

// ============================================
// メインコンポーネント
// ============================================

/**
 * 貸出管理ページ
 */
export function LoansPage(): React.ReactElement {
  // タブ状態
  const [activeTab, setActiveTab] = useState<TabType>('loan');

  // 貸出フォーム状態
  const [userId, setUserId] = useState('');
  const [bookCopyId, setBookCopyId] = useState('');
  const [loanReceipt, setLoanReceipt] = useState<LoanReceipt | null>(null);
  const [loanLoading, setLoanLoading] = useState(false);

  // 返却フォーム状態
  const [loanId, setLoanId] = useState('');
  const [returnResult, setReturnResult] = useState<ReturnResult | null>(null);
  const [returnLoading, setReturnLoading] = useState(false);

  // 共通状態
  const [alert, setAlert] = useState<AlertInfo | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // ============================================
  // 貸出処理
  // ============================================

  const validateLoanForm = useCallback((): boolean => {
    const errors: ValidationErrors = {};

    if (userId.trim() === '') {
      errors.userId = '利用者IDは必須です';
    }
    if (bookCopyId.trim() === '') {
      errors.bookCopyId = '蔵書コピーIDは必須です';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [userId, bookCopyId]);

  const handleLoanSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setAlert(null);
      setLoanReceipt(null);

      if (!validateLoanForm()) {
        return;
      }

      setLoanLoading(true);

      try {
        const receipt = await createLoan({
          userId: userId.trim(),
          bookCopyId: bookCopyId.trim(),
        });
        setLoanReceipt(receipt);
        setUserId('');
        setBookCopyId('');
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
        setLoanLoading(false);
      }
    },
    [userId, bookCopyId, validateLoanForm]
  );

  // ============================================
  // 返却処理
  // ============================================

  const validateReturnForm = useCallback((): boolean => {
    const errors: ValidationErrors = {};

    if (loanId.trim() === '') {
      errors.loanId = '貸出IDは必須です';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [loanId]);

  const handleReturnSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setAlert(null);
      setReturnResult(null);

      if (!validateReturnForm()) {
        return;
      }

      setReturnLoading(true);

      try {
        const result = await returnBook(loanId.trim());
        setReturnResult(result);
        setLoanId('');
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
        setReturnLoading(false);
      }
    },
    [loanId, validateReturnForm]
  );

  // ============================================
  // タブ切り替え
  // ============================================

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    setAlert(null);
    setValidationErrors({});
    setLoanReceipt(null);
    setReturnResult(null);
  }, []);

  const handleAlertClose = useCallback(() => {
    setAlert(null);
  }, []);

  // ============================================
  // レンダリング
  // ============================================

  return (
    <div data-testid="loans-page" className="loans-page">
      <h1>貸出管理</h1>

      {/* タブナビゲーション */}
      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          id="tab-loan"
          aria-selected={activeTab === 'loan'}
          aria-controls="panel-loan"
          className={`tab ${activeTab === 'loan' ? 'tab-active' : ''}`}
          onClick={() => handleTabChange('loan')}
        >
          貸出処理
        </button>
        <button
          type="button"
          role="tab"
          id="tab-return"
          aria-selected={activeTab === 'return'}
          aria-controls="panel-return"
          className={`tab ${activeTab === 'return' ? 'tab-active' : ''}`}
          onClick={() => handleTabChange('return')}
        >
          返却処理
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

      {/* 貸出処理パネル */}
      {activeTab === 'loan' && (
        <div
          role="tabpanel"
          id="panel-loan"
          aria-labelledby="tab-loan"
          className="tab-panel"
        >
          <form onSubmit={handleLoanSubmit} className="loan-form" noValidate>
            <FormInput
              id="userId"
              label="利用者ID"
              value={userId}
              onChange={setUserId}
              required
              error={validationErrors.userId}
              disabled={loanLoading}
            />
            <FormInput
              id="bookCopyId"
              label="蔵書コピーID"
              value={bookCopyId}
              onChange={setBookCopyId}
              required
              error={validationErrors.bookCopyId}
              disabled={loanLoading}
            />
            <button
              type="submit"
              className="submit-button"
              disabled={loanLoading}
            >
              {loanLoading ? '処理中...' : '貸出処理を実行'}
            </button>
          </form>

          {loanReceipt !== null && <LoanReceiptDisplay receipt={loanReceipt} />}
        </div>
      )}

      {/* 返却処理パネル */}
      {activeTab === 'return' && (
        <div
          role="tabpanel"
          id="panel-return"
          aria-labelledby="tab-return"
          className="tab-panel"
        >
          <form onSubmit={handleReturnSubmit} className="return-form" noValidate>
            <FormInput
              id="loanId"
              label="貸出ID"
              value={loanId}
              onChange={setLoanId}
              required
              error={validationErrors.loanId}
              disabled={returnLoading}
            />
            <button
              type="submit"
              className="submit-button"
              disabled={returnLoading}
            >
              {returnLoading ? '処理中...' : '返却処理を実行'}
            </button>
          </form>

          {returnResult !== null && <ReturnResultDisplay result={returnResult} />}
        </div>
      )}
    </div>
  );
}
