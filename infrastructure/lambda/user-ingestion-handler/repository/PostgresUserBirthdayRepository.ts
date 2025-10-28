import { Kysely } from 'kysely';
import { Database, UserBirthday, NewUserBirthday, BirthdayRecord, KyselyTrx } from '../types';

import { DatabaseConnectionManager } from './DatabaseConnectionManager';
import { UserBirthdayRepository } from './UserBirthdayRepository';

export class PostgresUserBirthdayRepository
  implements UserBirthdayRepository<UserBirthday, NewUserBirthday, BirthdayRecord>
{
  constructor(private dbManager: DatabaseConnectionManager) {}

  private get db(): Kysely<Database> {
    return this.dbManager.getDatabase();
  }

  async findAllBirthdays(): Promise<UserBirthday[]> {
    await this.dbManager.ensureConnection();
    return await this.db.selectFrom('user_birthday').selectAll().execute();
  }

  async findUserBirthdayByDayMonthTimezone(
    day: number,
    month: number,
    timezone: string
  ): Promise<BirthdayRecord | undefined> {
    await this.dbManager.ensureConnection();

    const query = this.db
      .selectFrom('user_birthday')

      .innerJoin('user', join => join.onRef('user_birthday.user_id', '=', 'user.id'))

      .where('user_birthday.month', '=', month)
      .where('user_birthday.day', '=', day)
      .where('user_birthday.timezone', '=', timezone);

    const result = await query
      .select([
        'user.id as userId',
        'user.first_name',
        'user.last_name',
        'user_birthday.timezone',
        'user_birthday.month',
        'user_birthday.day',
        'user_birthday.year as birthYear',
      ])
      .execute();

    return result;
  }

  async createUserBirthday(
    userBirthdayData: NewUserBirthday,
    trx: KyselyTrx
  ): Promise<UserBirthday> {
    return await trx
      .insertInto('user_birthday')
      .values(userBirthdayData)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
