import { Kysely } from 'kysely';
import { Database } from '../../lambda/user-ingestion-handler/types';
import { DateTime } from 'luxon';

export const insertUserWithBirthday = async (
  db: Kysely<Database>,
  userId: string,
  firstName: string,
  lastName: string,
  day: number,
  month: number,
  year: number,
  timezone: string,
  sentYear: number | null = null
) => {
  await db
    .insertInto('user')
    .values({
      id: userId,
      first_name: firstName,
      last_name: lastName,
    })
    .execute();

  return await db
    .insertInto('user_birthday')
    .values({
      user_id: userId,
      day,
      month,
      year,
      timezone,
      sent_year: sentYear,
    })
    .returning('id')
    .executeTakeFirst();
};

export const getCurrentDateInTimezone = (timezone: string) => {
  const now = DateTime.now();
  const localNow = now.setZone(timezone);

  return {
    day: localNow.day,
    month: localNow.month,
    year: localNow.year,
    hour: localNow.hour,
    minute: localNow.minute,
  };
};

export const getDifferentMonth = (currentMonth: number): number => {
  return currentMonth === 12 ? 1 : currentMonth + 1;
};

export const getDifferentDay = (currentDay: number): number => {
  return currentDay === 1 ? 15 : currentDay - 1;
};
