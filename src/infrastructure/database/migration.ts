/**
 * Migration definition
 */
export interface Migration {
  name: string;
  up: string;
  down: string;
  timestamp: number;
}

/**
 * Input for creating a migration
 */
export interface CreateMigrationInput {
  name: string;
  up: string;
  down: string;
}

/**
 * Create a migration
 */
export function createMigration(input: CreateMigrationInput): Migration {
  return {
    name: input.name,
    up: input.up,
    down: input.down,
    timestamp: Date.now(),
  };
}

/**
 * Migration runner to manage and execute migrations
 */
export class MigrationRunner {
  private migrations: Migration[] = [];

  /**
   * Register a migration
   */
  register(migration: Migration): void {
    this.migrations.push(migration);
    this.migrations.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get all registered migrations sorted by name
   */
  getMigrations(): Migration[] {
    return [...this.migrations];
  }
}
