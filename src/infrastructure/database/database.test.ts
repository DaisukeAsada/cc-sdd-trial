import { describe, it, expect } from 'vitest';
import {
  createDatabaseConfig,
  DatabaseConfig,
  DatabasePool,
} from './database.js';

describe('Database Configuration', () => {
  it('should create a database config with default values', () => {
    const config = createDatabaseConfig();
    
    expect(config).toBeDefined();
    expect(config.host).toBe('localhost');
    expect(config.port).toBe(5432);
    expect(config.database).toBe('library_db');
    expect(config.user).toBe('library_user');
    expect(config.password).toBe('library_password');
    expect(config.max).toBe(20);
  });

  it('should create a database config with custom values', () => {
    const config = createDatabaseConfig({
      host: 'custom-host',
      port: 5433,
      database: 'custom_db',
      user: 'custom_user',
      password: 'custom_password',
      max: 10,
    });

    expect(config.host).toBe('custom-host');
    expect(config.port).toBe(5433);
    expect(config.database).toBe('custom_db');
    expect(config.user).toBe('custom_user');
    expect(config.password).toBe('custom_password');
    expect(config.max).toBe(10);
  });
});

describe('DatabasePool', () => {
  it('should create a database pool instance', () => {
    const config = createDatabaseConfig();
    const pool = new DatabasePool(config);
    
    expect(pool).toBeDefined();
    expect(pool.getConfig()).toEqual(config);
  });

  it('should provide query method', () => {
    const config = createDatabaseConfig();
    const pool = new DatabasePool(config);
    
    expect(typeof pool.query).toBe('function');
  });

  it('should provide close method', () => {
    const config = createDatabaseConfig();
    const pool = new DatabasePool(config);
    
    expect(typeof pool.close).toBe('function');
  });
});
