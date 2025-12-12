import React, { useCallback, type ReactNode } from 'react';

/**
 * ソート方向
 */
export type SortDirection = 'asc' | 'desc';

/**
 * カラム定義
 */
export interface Column<T> {
  /** カラムのキー（データプロパティ名） */
  readonly key: keyof T & string;
  /** ヘッダーテキスト */
  readonly header: string;
  /** カスタムセルレンダラー */
  readonly render?: (item: T) => ReactNode;
  /** ソート可能かどうか */
  readonly sortable?: boolean;
  /** カラムの幅 */
  readonly width?: string;
}

/**
 * DataTable コンポーネントのプロパティ
 */
export interface DataTableProps<T> {
  /** 表示するデータ配列 */
  readonly data: readonly T[];
  /** カラム定義 */
  readonly columns: readonly Column<T>[];
  /** 各行を一意に識別するフィールド */
  readonly keyField: keyof T & string;
  /** データが空の場合のメッセージ */
  readonly emptyMessage?: string;
  /** ローディング状態 */
  readonly loading?: boolean;
  /** 行クリック時のコールバック */
  readonly onRowClick?: (item: T) => void;
  /** ソート時のコールバック */
  readonly onSort?: (key: string, direction: SortDirection) => void;
  /** 現在のソートキー */
  readonly sortKey?: string;
  /** 現在のソート方向 */
  readonly sortDirection?: SortDirection;
  /** テーブルのaria-label */
  readonly ariaLabel?: string;
  /** 追加のCSSクラス */
  readonly className?: string;
}

/**
 * 汎用データテーブルコンポーネント
 */
export function DataTable<T>({
  data,
  columns,
  keyField,
  emptyMessage = 'データがありません',
  loading = false,
  onRowClick,
  onSort,
  sortKey,
  sortDirection,
  ariaLabel,
  className = '',
}: DataTableProps<T>): React.ReactElement {
  const handleHeaderClick = useCallback((column: Column<T>) => {
    if (column.sortable !== true || onSort === undefined) {
      return;
    }

    const newDirection: SortDirection =
      sortKey === column.key && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(column.key, newDirection);
  }, [sortKey, sortDirection, onSort]);

  const handleRowClick = useCallback((item: T) => {
    onRowClick?.(item);
  }, [onRowClick]);

  const getSortIndicator = (column: Column<T>): string => {
    if (sortKey !== column.key) {
      return '';
    }
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  // data が配列でない場合は空配列として扱う
  const safeData = Array.isArray(data) ? data : [];

  // ローディング中
  if (loading) {
    return (
      <div className="data-table-loading" role="status">
        <span className="data-table-spinner" />
        <span>読み込み中...</span>
      </div>
    );
  }

  // データが空の場合
  if (safeData.length === 0) {
    return (
      <div className={`data-table-container ${className}`}>
        <table className="data-table" aria-label={ariaLabel}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="data-table-header"
                  style={{ width: column.width }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
        </table>
        <div className="data-table-empty">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className={`data-table-container ${className}`}>
      <table className="data-table" aria-label={ariaLabel}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`data-table-header ${column.sortable === true ? 'data-table-header-sortable' : ''}`}
                style={{ width: column.width }}
                onClick={() => handleHeaderClick(column)}
                role="columnheader"
                aria-sort={
                  sortKey === column.key
                    ? sortDirection === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
              >
                {column.header}
                {column.sortable === true && sortKey === column.key && (
                  <span className="data-table-sort-indicator">
                    {getSortIndicator(column)}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {safeData.map((item) => (
            <tr
              key={String(item[keyField])}
              className={`data-table-row ${onRowClick !== undefined ? 'data-table-row-clickable' : ''}`}
              onClick={() => handleRowClick(item)}
            >
              {columns.map((column) => (
                <td key={column.key} className="data-table-cell">
                  {column.render !== undefined
                    ? column.render(item)
                    : String(item[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
