import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { Database } from '../../../lambda/user-ingestion-handler/types';
import { DateTime } from 'luxon';

describe('BirthdayGreeterHandler Integration Test', () => {
  let db: Kysely<Database>;

  beforeAll(async () => {
    const pool = new Pool({
      host: 'localhost',
      port: 5433,
      user: 'test',
      password: 'test',
      database: 'postgres',
      max: 2,
      min: 0,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', err => {
      console.error('Unexpected error on idle client', err);
    });

    db = new Kysely<Database>({
      dialect: new PostgresDialect({ pool }),
    });

    await db.deleteFrom('user_birthday').execute();
    await db.deleteFrom('user').execute();
  });

  afterAll(async () => {
    try {
      if (db) {
        await db.destroy();
      }
    } catch (error) {
      console.error('Error during test teardown:', error);
    }
  });

  afterEach(async () => {
    await db.deleteFrom('user_birthday').execute();
    await db.deleteFrom('user').execute();
  });

  test('should update sent_year when greeting sent', async () => {
    const userId = 'c0ab3539-8198-4a9c-8417-65beb5a7ad16';
    const currentYear = DateTime.now().year;

    await db
      .insertInto('user')
      .values({
        id: userId,
        first_name: 'John',
        last_name: 'Doe',
      })
      .execute();

    await db
      .insertInto('user_birthday')
      .values({
        user_id: userId,
        day: 29,
        month: 10,
        year: 1990,
        timezone: 'America/New_York',
        sent_year: undefined,
      })
      .execute();

    const updated = await db
      .updateTable('user_birthday')
      .set({ sent_year: currentYear })
      .where('user_id', '=', userId)
      .where(eb =>
        eb.or([eb('sent_year', 'is', null), eb('sent_year', '<', currentYear)])
      )
      .returning('id')
      .executeTakeFirst();

    expect(updated).toBeDefined();
  });

  test('should not update if already greeted this year', async () => {
    const userId = 'fa851830-cb21-428b-beb5-74e5eccd531a';
    const currentYear = DateTime.now().year;

    await db
      .insertInto('user')
      .values({
        id: userId,
        first_name: 'Jane',
        last_name: 'Smith',
      })
      .execute();

    await db
      .insertInto('user_birthday')
      .values({
        user_id: userId,
        day: 29,
        month: 10,
        year: 1985,
        timezone: 'Europe/London',
        sent_year: currentYear,
      })
      .execute();

    const updated = await db
      .updateTable('user_birthday')
      .set({ sent_year: currentYear })
      .where('user_id', '=', userId)
      .where(eb =>
        eb.or([eb('sent_year', 'is', null), eb('sent_year', '<', currentYear)])
      )
      .returning('id')
      .executeTakeFirst();

    expect(updated).toBeUndefined();
  });

  test('should allow update if greeted in previous year', async () => {
    const userId = '0c48cf92-245f-4fa8-89b0-f4227a85d7aa';
    const currentYear = DateTime.now().year;
    const previousYear = currentYear - 1;

    await db
      .insertInto('user')
      .values({
        id: userId,
        first_name: 'Bob',
        last_name: 'Johnson',
      })
      .execute();

    await db
      .insertInto('user_birthday')
      .values({
        user_id: userId,
        day: 29,
        month: 10,
        year: 1992,
        timezone: 'Asia/Tokyo',
        sent_year: previousYear,
      })
      .execute();

    const updated = await db
      .updateTable('user_birthday')
      .set({ sent_year: currentYear })
      .where('user_id', '=', userId)
      .where(eb =>
        eb.or([eb('sent_year', 'is', null), eb('sent_year', '<', currentYear)])
      )
      .returning('id')
      .executeTakeFirst();

    expect(updated).toBeDefined();
  });

  test('should set sent_year to current year', async () => {
    const userId = '25ef16a8-eb04-4a14-93e0-0f99d7a58218';
    const currentYear = DateTime.now().year;

    await db
      .insertInto('user')
      .values({
        id: userId,
        first_name: 'Alice',
        last_name: 'Williams',
      })
      .execute();

    await db
      .insertInto('user_birthday')
      .values({
        user_id: userId,
        day: 29,
        month: 10,
        year: 1988,
        timezone: 'America/Los_Angeles',
        sent_year: undefined,
      })
      .execute();

    await db
      .updateTable('user_birthday')
      .set({ sent_year: currentYear })
      .where('user_id', '=', userId)
      .where(eb =>
        eb.or([eb('sent_year', 'is', null), eb('sent_year', '<', currentYear)])
      )
      .returning('id')
      .executeTakeFirst();

    const result = await db
      .selectFrom('user_birthday')
      .where('user_id', '=', userId)
      .select('sent_year')
      .executeTakeFirst();

    expect(result?.sent_year).toBe(currentYear);
  });

  test('should return updated record when successful', async () => {
    const userId = '693f9893-16db-4617-b8b9-1a0b7723b0cc';
    const currentYear = DateTime.now().year;

    await db
      .insertInto('user')
      .values({
        id: userId,
        first_name: 'Charlie',
        last_name: 'Brown',
      })
      .execute();

    await db
      .insertInto('user_birthday')
      .values({
        user_id: userId,
        day: 29,
        month: 10,
        year: 1995,
        timezone: 'Australia/Sydney',
        sent_year: undefined,
      })
      .execute();

    const updated = await db
      .updateTable('user_birthday')
      .set({ sent_year: currentYear })
      .where('user_id', '=', userId)
      .where(eb =>
        eb.or([eb('sent_year', 'is', null), eb('sent_year', '<', currentYear)])
      )
      .returning('id')
      .executeTakeFirst();

    expect(updated?.id).toBeDefined();
  });
});
