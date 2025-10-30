import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { Database } from '../types';

// Global cache for database connection (persists across Lambda invocations)
let cachedDb: Kysely<Database> | null = null;

export class DatabaseConnectionManager {
  private db: Kysely<Database>;

  constructor() {
    this.db = this.getCachedConnectionSync();
  }

  private createDatabaseConnection(): Kysely<Database> {
    console.log('Creating new database connection (will be cached)');

    return new Kysely<Database>({
      dialect: new PostgresDialect({
        pool: async () => {
          console.log('Initializing connection pool');
          return new Pool({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT || '5432'),
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            max: 2,
            min: 0,
            idleTimeoutMillis: 10000,
            connectionTimeoutMillis: 5000,
          });
        },
      }),
    });
  }

  private getCachedConnectionSync(): Kysely<Database> {
    if (!cachedDb) {
      console.log('Creating new cached database connection');
      cachedDb = this.createDatabaseConnection();
    } else {
      console.log('Reusing cached database connection');
    }

    return cachedDb;
  }

  async ensureConnection(): Promise<void> {
    if (cachedDb) {
      try {
        await cachedDb.selectFrom('user').select('id').limit(1).execute();
        console.log('Connection test successful');
      } catch (error) {
        console.error('Stale connection detected, recreating...', error);
        cachedDb = null;
        this.db = this.getCachedConnectionSync();
      }
    }
  }

  getDatabase(): Kysely<Database> {
    return this.db;
  }

  async close(): Promise<void> {
    // Don't destroy cached connection - reuse for next invocation
    console.log('Keeping database connection cached for next invocation');
  }

  // Static method to reset cache if needed (useful for testing)
  static resetCache(): void {
    if (cachedDb) {
      console.log('Resetting database connection cache');
      cachedDb = null;
    }
  }
}
