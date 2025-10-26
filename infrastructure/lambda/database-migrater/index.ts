import { Handler } from 'aws-lambda';
import { Kysely, PostgresDialect, Migrator, FileMigrationProvider, sql } from 'kysely';
import { Pool } from 'pg';
import * as path from 'path';
import { promises as fs } from 'fs';

interface EventType {
  RequestType: 'Create' | 'Update' | 'Delete';
}
export const handler: Handler = async (event: EventType) => {
  console.log('Migration event:', JSON.stringify(event, null, 2));

  const db = new Kysely({
    dialect: new PostgresDialect({
      pool: new Pool({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        max: 2,
        min: 0,
        idleTimeoutMillis: 10000,
      }),
    }),
  });

  try {
    await sql`SELECT 1`.execute(db);
    console.log('Database connection established successfully');

    const migrator = new Migrator({
      db,
      provider: new FileMigrationProvider({
        fs,
        path,
        migrationFolder: path.join(__dirname, 'migrations'),
      }),
    });

    console.log('Starting database migration...');

    const { error, results } = await migrator.migrateToLatest();

    if (error) {
      console.error('Migration failed:', error);
      throw error;
    }

    const appliedMigrations =
      results?.map(it => ({
        migrationName: it.migrationName,
        direction: it.direction,
        status: it.status,
      })) || [];

    console.log('Migrations completed successfully:', appliedMigrations);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Migrations completed',
        applied: appliedMigrations,
      }),
    };
  } catch (error) {
    console.error('Migration error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  } finally {
    await db.destroy();
  }
};
