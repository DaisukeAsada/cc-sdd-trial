/**
 * データベース初期化スクリプト
 *
 * PostgreSQLにテーブルを作成します
 */

import { DatabasePool, createDatabaseConfig } from '../infrastructure/database/database.js';
import {
  createBooksTableMigration,
  createBookCopiesTableMigration,
  createUsersTableMigration,
  createLoansTableMigration,
  createReservationsTableMigration,
  createOverdueRecordsTableMigration,
} from '../infrastructure/database/schema.js';

async function initDatabase(): Promise<void> {
  const pool = new DatabasePool(
    createDatabaseConfig({
      host: process.env.POSTGRES_HOST ?? 'postgres',
      port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
      database: process.env.POSTGRES_DB ?? 'library_db',
      user: process.env.POSTGRES_USER ?? 'library_user',
      password: process.env.POSTGRES_PASSWORD ?? 'library_password',
    })
  );

  console.log('🔌 Connecting to PostgreSQL...');

  try {
    // 接続テスト
    await pool.query('SELECT 1');
    console.log('✅ Connected to PostgreSQL');

    // マイグレーション実行
    const migrations = [
      createBooksTableMigration(),
      createBookCopiesTableMigration(),
      createUsersTableMigration(),
      createLoansTableMigration(),
      createReservationsTableMigration(),
      createOverdueRecordsTableMigration(),
    ];

    console.log('📦 Running migrations...');

    for (const migration of migrations) {
      console.log(`  ⏳ ${migration.name}...`);
      try {
        await pool.query(migration.up);
        console.log(`  ✅ ${migration.name}`);
      } catch (error) {
        const pgError = error as { code?: string; message?: string };
        // テーブルが既に存在する場合はスキップ
        if (pgError.code === '42P07') {
          console.log(`  ⏭️  ${migration.name} (already exists)`);
        } else {
          throw error;
        }
      }
    }

    console.log('🎉 Database initialization complete!');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const errorLog = console.error.bind(console);
    errorLog(`❌ Database initialization failed: ${message}`);
    process.exit(1);
  } finally {
    await pool.close();
  }
}

void initDatabase();
