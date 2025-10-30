import { Kysely, sql } from 'kysely';
import { Database } from '../../user-ingestion-handler/types';

export interface BirthdayUser {
  userId: string;
  firstName: string;
  lastName: string;
  timezone: string;
  month: number;
  day: number;
  sentYear: number | null;
}

export class BirthdayRepository {
  constructor(private readonly db: Kysely<Database>) {}

  async findUsersNeedingGreetingSoon(
    timezones: string[],
    month: number,
    day: number
  ): Promise<BirthdayUser[]> {
    if (timezones.length === 0) {
      return [];
    }

    const currentYear = new Date().getUTCFullYear();

    const results = await this.db
      .selectFrom('user_birthday as ub')
      .innerJoin('user as u', 'u.id', 'ub.user_id')
      .where('ub.timezone', 'in', timezones)
      .where('ub.month', '=', month)
      .where('ub.day', '=', day)
      .where(eb =>
        eb.or([eb('ub.sent_year', 'is', null), eb('ub.sent_year', '<', currentYear)])
      )
      .select([
        'u.id as userId',
        'u.first_name as firstName',
        'u.last_name as lastName',
        'ub.timezone',
        'ub.month',
        'ub.day',
        'ub.sent_year as sentYear',
      ])
      .execute();

    return results.map(r => ({
      userId: r.userId,
      firstName: r.firstName,
      lastName: r.lastName || '',
      timezone: r.timezone,
      month: r.month,
      day: r.day,
      sentYear: r.sentYear ?? null,
    }));
  }
}
