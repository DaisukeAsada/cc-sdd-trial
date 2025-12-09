import { describe, it, expect } from 'vitest';
import {
  createBooksTableMigration,
  createBookCopiesTableMigration,
  createUsersTableMigration,
  createLoansTableMigration,
  createReservationsTableMigration,
  createOverdueRecordsTableMigration,
  createFullTextSearchIndexMigration,
  getAllMigrations,
} from './schema.js';

describe('Schema Migrations', () => {
  describe('Books Table', () => {
    it('should create books table migration with correct structure', () => {
      const migration = createBooksTableMigration();
      
      expect(migration.name).toBe('001_create_books_table');
      expect(migration.up).toContain('CREATE TABLE books');
      expect(migration.up).toContain('id UUID PRIMARY KEY');
      expect(migration.up).toContain('title VARCHAR(500) NOT NULL');
      expect(migration.up).toContain('author VARCHAR(300) NOT NULL');
      expect(migration.up).toContain('publisher VARCHAR(300)');
      expect(migration.up).toContain('publication_year INTEGER');
      expect(migration.up).toContain('isbn VARCHAR(13) NOT NULL UNIQUE');
      expect(migration.up).toContain('category VARCHAR(100)');
      expect(migration.up).toContain('created_at TIMESTAMP WITH TIME ZONE');
      expect(migration.up).toContain('updated_at TIMESTAMP WITH TIME ZONE');
      expect(migration.down).toBe('DROP TABLE IF EXISTS books;');
    });
  });

  describe('BookCopies Table', () => {
    it('should create book_copies table migration with correct structure', () => {
      const migration = createBookCopiesTableMigration();
      
      expect(migration.name).toBe('002_create_book_copies_table');
      expect(migration.up).toContain('CREATE TABLE book_copies');
      expect(migration.up).toContain('id UUID PRIMARY KEY');
      expect(migration.up).toContain('book_id UUID NOT NULL REFERENCES books(id)');
      expect(migration.up).toContain('location VARCHAR(100) NOT NULL');
      expect(migration.up).toContain('status VARCHAR(20) NOT NULL');
      expect(migration.up).toContain("DEFAULT 'AVAILABLE'");
      expect(migration.up).toContain("CHECK (status IN ('AVAILABLE', 'BORROWED', 'RESERVED', 'MAINTENANCE'))");
      expect(migration.down).toBe('DROP TABLE IF EXISTS book_copies;');
    });
  });

  describe('Users Table', () => {
    it('should create users table migration with correct structure', () => {
      const migration = createUsersTableMigration();
      
      expect(migration.name).toBe('003_create_users_table');
      expect(migration.up).toContain('CREATE TABLE users');
      expect(migration.up).toContain('id UUID PRIMARY KEY');
      expect(migration.up).toContain('name VARCHAR(200) NOT NULL');
      expect(migration.up).toContain('address VARCHAR(500)');
      expect(migration.up).toContain('email VARCHAR(254) NOT NULL UNIQUE');
      expect(migration.up).toContain('phone VARCHAR(20)');
      expect(migration.up).toContain('registered_at');
      expect(migration.up).toContain('loan_limit INTEGER NOT NULL DEFAULT 5');
      expect(migration.down).toBe('DROP TABLE IF EXISTS users;');
    });
  });

  describe('Loans Table', () => {
    it('should create loans table migration with correct structure', () => {
      const migration = createLoansTableMigration();
      
      expect(migration.name).toBe('004_create_loans_table');
      expect(migration.up).toContain('CREATE TABLE loans');
      expect(migration.up).toContain('id UUID PRIMARY KEY');
      expect(migration.up).toContain('user_id UUID NOT NULL REFERENCES users(id)');
      expect(migration.up).toContain('book_copy_id UUID NOT NULL REFERENCES book_copies(id)');
      expect(migration.up).toContain('borrowed_at');
      expect(migration.up).toContain('due_date DATE NOT NULL');
      expect(migration.up).toContain('returned_at');
      expect(migration.down).toBe('DROP TABLE IF EXISTS loans;');
    });
  });

  describe('Reservations Table', () => {
    it('should create reservations table migration with correct structure', () => {
      const migration = createReservationsTableMigration();
      
      expect(migration.name).toBe('005_create_reservations_table');
      expect(migration.up).toContain('CREATE TABLE reservations');
      expect(migration.up).toContain('id UUID PRIMARY KEY');
      expect(migration.up).toContain('user_id UUID NOT NULL REFERENCES users(id)');
      expect(migration.up).toContain('book_id UUID NOT NULL REFERENCES books(id)');
      expect(migration.up).toContain('reserved_at');
      expect(migration.up).toContain('notified_at');
      expect(migration.up).toContain('expires_at');
      expect(migration.up).toContain('status VARCHAR(20) NOT NULL');
      expect(migration.up).toContain("CHECK (status IN ('PENDING', 'NOTIFIED', 'FULFILLED', 'EXPIRED', 'CANCELLED'))");
      expect(migration.down).toBe('DROP TABLE IF EXISTS reservations;');
    });
  });

  describe('OverdueRecords Table', () => {
    it('should create overdue_records table migration with correct structure', () => {
      const migration = createOverdueRecordsTableMigration();
      
      expect(migration.name).toBe('006_create_overdue_records_table');
      expect(migration.up).toContain('CREATE TABLE overdue_records');
      expect(migration.up).toContain('id UUID PRIMARY KEY');
      expect(migration.up).toContain('loan_id UUID NOT NULL REFERENCES loans(id)');
      expect(migration.up).toContain('overdue_days INTEGER NOT NULL');
      expect(migration.up).toContain('recorded_at');
      expect(migration.down).toBe('DROP TABLE IF EXISTS overdue_records;');
    });
  });

  describe('Full Text Search Index', () => {
    it('should create GIN index migration for full text search', () => {
      const migration = createFullTextSearchIndexMigration();
      
      expect(migration.name).toBe('007_create_full_text_search_index');
      expect(migration.up).toContain('CREATE INDEX');
      expect(migration.up).toContain('ON books');
      expect(migration.up).toContain('GIN');
      expect(migration.up).toContain('to_tsvector');
      expect(migration.up).toContain('title');
      expect(migration.up).toContain('author');
      expect(migration.down).toContain('DROP INDEX');
    });
  });

  describe('Get All Migrations', () => {
    it('should return all migrations in correct order', () => {
      const migrations = getAllMigrations();
      
      expect(migrations).toHaveLength(7);
      expect(migrations[0]!.name).toBe('001_create_books_table');
      expect(migrations[1]!.name).toBe('002_create_book_copies_table');
      expect(migrations[2]!.name).toBe('003_create_users_table');
      expect(migrations[3]!.name).toBe('004_create_loans_table');
      expect(migrations[4]!.name).toBe('005_create_reservations_table');
      expect(migrations[5]!.name).toBe('006_create_overdue_records_table');
      expect(migrations[6]!.name).toBe('007_create_full_text_search_index');
    });
  });
});
