// Database module exports
export { DatabaseConfig, DatabasePool, createDatabaseConfig } from './database.js';
export { Migration, MigrationRunner, createMigration } from './migration.js';
export {
  createBooksTableMigration,
  createBookCopiesTableMigration,
  createUsersTableMigration,
  createLoansTableMigration,
  createReservationsTableMigration,
  createOverdueRecordsTableMigration,
  createFullTextSearchIndexMigration,
  getAllMigrations,
} from './schema.js';
