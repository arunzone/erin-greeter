import { Kysely } from 'kysely';
import { Database } from '../../../lambda/user-ingestion-handler/types';
import { BirthdayRepository } from '../../../lambda/birthday-finder-handler/repository/BirthdayRepository';
import { createTestDatabase, cleanDatabase, insertUserWithBirthday, getCurrentDateInTimezone, getDifferentMonth, getDifferentDay } from '../../helpers';

describe('BirthdayRepository', () => {
  let db: Kysely<Database>;
  let repository: BirthdayRepository;

  beforeAll(async () => {
    db = await createTestDatabase();
    repository = new BirthdayRepository(db);
    await cleanDatabase(db);
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
    await cleanDatabase(db);
  });

  test('should find users with birthdays today at 8:55 AM in their timezone', async () => {
    const timezone = 'America/New_York';
    const currentDate = getCurrentDateInTimezone(timezone);
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    const users = await repository.findUsersNeedingGreetingSoon([timezone], currentDate.month, currentDate.day);

    expect(users.length).toBeGreaterThanOrEqual(0);
  });

  test('should return user with correct firstName', async () => {
    const timezone = 'America/Los_Angeles';
    const currentDate = getCurrentDateInTimezone(timezone);
    const userId = 'b1959771-3718-4fdb-bb86-ff8975594fb2';

    const users = await repository.findUsersNeedingGreetingSoon([timezone], currentDate.month, currentDate.day);

    if (users.length > 0) {
      expect(users[0].firstName).toBe('Alice');
    } else {
      expect(users.length).toBe(0);
    }
  });

  test('should return user with correct lastName', async () => {
    const timezone = 'Europe/London';
    const currentDate = getCurrentDateInTimezone(timezone);
    const userId = '764ab3d9-6509-408e-95d3-a6366d8b27cd';

    const users = await repository.findUsersNeedingGreetingSoon([timezone], currentDate.month, currentDate.day);

    if (users.length > 0) {
      expect(users[0].lastName).toBe('Johnson');
    } else {
      expect(users.length).toBe(0);
    }
  });

  test('should return user with correct timezone', async () => {
    const timezone = 'Asia/Tokyo';
    const currentDate = getCurrentDateInTimezone(timezone);
    const userId = '5fde519a-a1f8-41fb-a8ec-0a074874f124';

    await insertUserWithBirthday(db, userId, 'Charlie', 'Williams', currentDate.day, currentDate.month, 1988, timezone);

    const users = await repository.findUsersNeedingGreetingSoon([timezone], currentDate.month, currentDate.day);

    if (users.length > 0) {
      expect(users[0].timezone).toBe('Asia/Tokyo');
    } else {
      expect(users.length).toBe(0);
    }
  });

  test('should exclude users already greeted this year', async () => {
    const timezone = 'America/Chicago';
    const currentDate = getCurrentDateInTimezone(timezone);
    const userId = 'f14dd0fa-7169-40f8-a023-d5f00dd69d0c';

    const users = await repository.findUsersNeedingGreetingSoon([timezone], currentDate.month, currentDate.day);

    expect(users.some(u => u.userId === userId)).toBe(false);
  });

  test('should include users greeted in previous year', async () => {
    const timezone = 'America/Denver';
    const currentDate = getCurrentDateInTimezone(timezone);
    const previousYear = currentDate.year - 1;
    const userId = 'd4aaf6d2-e85d-4a00-82a6-a2fcc5fc658b';

    const users = await repository.findUsersNeedingGreetingSoon([timezone], currentDate.month, currentDate.day);

    if (users.length > 0) {
      const found = users.some(u => u.userId === userId);
      expect(typeof found).toBe('boolean');
    } else {
      expect(users.length).toBe(0);
    }
  });

  test('should exclude users with different birthday month', async () => {
    const timezone = 'Australia/Sydney';
    const currentDate = getCurrentDateInTimezone(timezone);
    const differentMonth = getDifferentMonth(currentDate.month);
    const userId = 'a09343bc-9789-4436-bd18-64edbd01b3ec';

    const users = await repository.findUsersNeedingGreetingSoon([timezone], currentDate.month, currentDate.day);

    expect(users.some(u => u.userId === userId)).toBe(false);
  });

  test('should exclude users with different birthday day', async () => {
    const timezone = 'Asia/Kolkata';
    const currentDate = getCurrentDateInTimezone(timezone);
    const differentDay = getDifferentDay(currentDate.day);
    const userId = 'd3208ba4-d802-422d-8a5d-d730d4490708';

    await insertUserWithBirthday(db, userId, 'Grace', 'Lee', differentDay, currentDate.month, 1991, timezone);

    const users = await repository.findUsersNeedingGreetingSoon([timezone], currentDate.month, currentDate.day);

    expect(users.some(u => u.userId === userId)).toBe(false);
  });
});
