import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { Database } from '../../lambda/user-ingestion-handler/types';
import { DATABASE_CONFIG, setupPostgresTypeParser } from './testConfig';

export const createTestDatabase = async (): Promise<Kysely<Database>> => {
  setupPostgresTypeParser();

  const pool = new Pool(DATABASE_CONFIG);
  pool.on('error', err => {
    console.error('Unexpected error on idle client', err);
  });

  const db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });

  return db;
};

export const cleanDatabase = async (db: Kysely<Database>): Promise<void> => {
  await db.deleteFrom('user_birthday').execute();
  await db.deleteFrom('user').execute();
};

export const insertUser = async (db: Kysely<Database>, userId: string, firstName: string, lastName: string) => {
  return await db
    .insertInto('user')
    .values({
      id: userId,
      first_name: firstName,
      last_name: lastName,
    })
    .returning('id')
    .executeTakeFirst();
};

export const insertUserBirthday = async (
  db: Kysely<Database>,
  userId: string,
  day: number,
  month: number,
  year: number,
  timezone: string
) => {
  return await db
    .insertInto('user_birthday')
    .values({
      user_id: userId,
      day,
      month,
      year,
      timezone,
    })
    .returning('id')
    .executeTakeFirst();
};

export const findUserById = async (db: Kysely<Database>, userId: string) => {
  return await db.selectFrom('user').where('id', '=', userId).selectAll().executeTakeFirst();
};

export const findUserBirthdayByUserId = async (db: Kysely<Database>, userId: string) => {
  return await db
    .selectFrom('user_birthday')
    .where('user_id', '=', userId)
    .selectAll()
    .executeTakeFirst();
};
