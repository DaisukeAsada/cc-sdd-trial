import React from 'react';
import { Link } from 'react-router-dom';

/**
 * ホームページ
 */
export function HomePage(): React.ReactElement {
  return (
    <div data-testid="home-page">
      <h1>図書館蔵書管理システム</h1>
      <p>蔵書の管理・検索・貸出・返却を効率的に行うシステムです。</p>
      
      <nav style={{ marginTop: '2rem' }}>
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          <li>
            <Link to="/books" style={linkStyle}>📚 蔵書管理</Link>
          </li>
          <li>
            <Link to="/books/search" style={linkStyle}>🔍 蔵書検索</Link>
          </li>
          <li>
            <Link to="/loans" style={linkStyle}>📖 貸出管理</Link>
          </li>
          <li>
            <Link to="/users" style={linkStyle}>👥 利用者管理</Link>
          </li>
          <li>
            <Link to="/reservations" style={linkStyle}>📅 予約管理</Link>
          </li>
          <li>
            <Link to="/reports" style={linkStyle}>📊 レポート</Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}

const linkStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '1rem 1.5rem',
  backgroundColor: '#007bff',
  color: 'white',
  textDecoration: 'none',
  borderRadius: '8px',
  fontWeight: 'bold',
  transition: 'background-color 0.2s',
};
