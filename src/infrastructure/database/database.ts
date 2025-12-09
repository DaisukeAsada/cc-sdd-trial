import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max: number;
}

/**
 * Create database configuration with defaults
 */
export function createDatabaseConfig(
  overrides: Partial<DatabaseConfig> = {}
): DatabaseConfig {
  return {
    host: overrides.host ?? 'localhost',
    port: overrides.port ?? 5432,
    database: overrides.database ?? 'library_db',
    user: overrides.user ?? 'library_user',
    password: overrides.password ?? 'library_password',
    max: overrides.max ?? 20,
  };
}

/**
 * Database connection pool wrapper
 */
export class DatabasePool {
  private pool: Pool;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: config.max,
    };
    this.pool = new Pool(poolConfig);
  }

  /**
   * Get the current configuration
   */
  getConfig(): DatabaseConfig {
    return { ...this.config };
  }

  /**
   * Execute a query
   */
  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  /**
   * Close the connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
