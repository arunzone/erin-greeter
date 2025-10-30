import { Kysely, PostgresDialect } from 'kysely';
import { DateTime } from 'luxon';
import { Database } from '../../../lambda/user-ingestion-handler/types';
import { DatabaseConnectionManager } from '../../../lambda/birthday-greeter-handler/repository/DatabaseConnectionManager';
import { PostgresBirthdayGreetingRepository } from '../../../lambda/birthday-greeter-handler/repository/PostgresBirthdayGreetingRepository';

describe('PostgresBirthdayGreetingRepository Integration Test', () => {
  let db: Kysely<Database>;
  let dbManager: DatabaseConnectionManager;
  let repository: PostgresBirthdayGreetingRepository;

  const setupUserAndBirthday = async (userId: string, firstName: string, lastName: string, day: number, month: number, year: number, timezone: string, sentYear: number | undefined = undefined) => {
    await db
      .insertInto('user')
      .values({
        id: userId,
        first_name: firstName,
        last_name: lastName,
      })
      .execute();

    await db
      .insertInto('user_birthday')
      .values({
        user_id: userId,
        day: day,
        month: month,
        year: year,
        timezone: timezone,
        sent_year: sentYear,
      })
      .execute();
    return userId;
  };

  beforeAll(async () => {
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '5433';
    process.env.DB_USERNAME = 'test';
    process.env.DB_PASSWORD = 'test';
    process.env.DB_NAME = 'postgres';

    dbManager = new DatabaseConnectionManager();
    db = dbManager.getDatabase();
    repository = new PostgresBirthdayGreetingRepository(dbManager);
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

  beforeEach(async () => {
    await db.deleteFrom('user_birthday').execute();
    await db.deleteFrom('user').execute();
  });

  test('should return true when sent_year is null and updated', async () => {
    const userId = '3772875b-ad37-49b3-96bd-62b0510fb88c';
    const currentYear = DateTime.now().year;

    await setupUserAndBirthday(userId, 'John', 'Doe', 29, 10, 1990, 'America/New_York', undefined);

    const updated = await repository.updateSentYear(userId, currentYear);
    expect(updated).toBe(true);
  });

  test('should set sent_year to current year when it is null', async () => {
    const userId = '3372940b-0cc3-478f-92d4-6b4cd976af10';
    const currentYear = DateTime.now().year;

    await setupUserAndBirthday(userId, 'John', 'Doe', 29, 10, 1990, 'America/New_York', undefined);

    await repository.updateSentYear(userId, currentYear);

    const result = await db
      .selectFrom('user_birthday')
      .where('user_id', '=', userId)
      .select('sent_year')
      .executeTakeFirst();

    expect(result?.sent_year).toBe(currentYear);
  });

  test('should return true when sent_year is less than the current year and updated', async () => {
    const userId = 'd7e18d76-ea96-4cff-952e-a76cabb915fd';
    const currentYear = DateTime.now().year;
    const previousYear = currentYear - 1;

    await setupUserAndBirthday(userId, 'Jane', 'Smith', 29, 10, 1985, 'Europe/London', previousYear);

    const updated = await repository.updateSentYear(userId, currentYear);
    expect(updated).toBe(true);
  });

  test('should set sent_year to current year when it is less than the current year', async () => {
    const userId = 'cdef31e5-1ead-4e50-85d1-6cbf14d812c2';
    const currentYear = DateTime.now().year;
    const previousYear = currentYear - 1;

    await setupUserAndBirthday(userId, 'Jane', 'Smith', 29, 10, 1985, 'Europe/London', previousYear);

    await repository.updateSentYear(userId, currentYear);

    const result = await db
      .selectFrom('user_birthday')
      .where('user_id', '=', userId)
      .select('sent_year')
      .executeTakeFirst();

    expect(result?.sent_year).toBe(currentYear);
  });

  test('should return false when sent_year is equal to the current year and not updated', async () => {
    const userId = '6ebbf769-eb2e-4341-85ff-bd79d5d0907a';
    const currentYear = DateTime.now().year;

    await setupUserAndBirthday(userId, 'Bob', 'Johnson', 29, 10, 1992, 'Asia/Tokyo', currentYear);

    const updated = await repository.updateSentYear(userId, currentYear);
    expect(updated).toBe(false);
  });

  test('should not change sent_year when it is equal to the current year', async () => {
    const userId = '1bbbd581-b62c-4c6c-9c7a-f903cef13021';
    const currentYear = DateTime.now().year;

    await setupUserAndBirthday(userId, 'Bob', 'Johnson', 29, 10, 1992, 'Asia/Tokyo', currentYear);

    await repository.updateSentYear(userId, currentYear);

    const result = await db
      .selectFrom('user_birthday')
      .where('user_id', '=', userId)
      .select('sent_year')
      .executeTakeFirst();

    expect(result?.sent_year).toBe(currentYear);
  });

  test('should return false if no record is updated', async () => {
    const userId = '694efc75-e314-4f6d-b07c-ee72f5b04490';
    const currentYear = DateTime.now().year;

    const updated = await repository.updateSentYear(userId, currentYear);
    expect(updated).toBe(false);
  });
});
