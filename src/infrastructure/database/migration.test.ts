import { describe, it, expect } from 'vitest';
import {
  Migration,
  MigrationRunner,
  createMigration,
} from './migration.js';

describe('Migration', () => {
  it('should create a migration with name, up, and down SQL', () => {
    const migration = createMigration({
      name: '001_create_books_table',
      up: 'CREATE TABLE books (id UUID PRIMARY KEY);',
      down: 'DROP TABLE books;',
    });

    expect(migration.name).toBe('001_create_books_table');
    expect(migration.up).toBe('CREATE TABLE books (id UUID PRIMARY KEY);');
    expect(migration.down).toBe('DROP TABLE books;');
  });

  it('should have a timestamp property', () => {
    const migration = createMigration({
      name: '001_create_books_table',
      up: 'CREATE TABLE books (id UUID PRIMARY KEY);',
      down: 'DROP TABLE books;',
    });

    expect(typeof migration.timestamp).toBe('number');
    expect(migration.timestamp).toBeGreaterThan(0);
  });
});

describe('MigrationRunner', () => {
  it('should create a migration runner instance', () => {
    const runner = new MigrationRunner();
    
    expect(runner).toBeDefined();
  });

  it('should register migrations', () => {
    const runner = new MigrationRunner();
    const migration = createMigration({
      name: '001_create_books_table',
      up: 'CREATE TABLE books (id UUID PRIMARY KEY);',
      down: 'DROP TABLE books;',
    });

    runner.register(migration);
    
    expect(runner.getMigrations()).toHaveLength(1);
    expect(runner.getMigrations()[0]!.name).toBe('001_create_books_table');
  });

  it('should sort migrations by name', () => {
    const runner = new MigrationRunner();
    
    runner.register(createMigration({
      name: '003_create_loans_table',
      up: 'CREATE TABLE loans (id UUID PRIMARY KEY);',
      down: 'DROP TABLE loans;',
    }));
    
    runner.register(createMigration({
      name: '001_create_books_table',
      up: 'CREATE TABLE books (id UUID PRIMARY KEY);',
      down: 'DROP TABLE books;',
    }));
    
    runner.register(createMigration({
      name: '002_create_users_table',
      up: 'CREATE TABLE users (id UUID PRIMARY KEY);',
      down: 'DROP TABLE users;',
    }));

    const migrations = runner.getMigrations();
    expect(migrations[0]!.name).toBe('001_create_books_table');
    expect(migrations[1]!.name).toBe('002_create_users_table');
    expect(migrations[2]!.name).toBe('003_create_loans_table');
  });
});
