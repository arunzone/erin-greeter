import { KyselyTrx } from '../types';
import { DeleteResult } from 'kysely';

export interface UserBirthdayRepository<TSelect, TInsert, TFind> {
  // Read methods use the TSelect (Output) type
  findAllBirthdays(): Promise<TSelect[]>;
  findUserBirthdayByDayMonthTimezone(
    day: number,
    month: number,
    timezone: string
  ): Promise<TFind | undefined>;

  // Write methods use the TInsert (Input) type, but still return TSelect (the final inserted object)
  createUserBirthday(userBirthday: TInsert, trx: KyselyTrx): Promise<TSelect>;
  deleteUserBirthday(userId: string, trx: KyselyTrx): Promise<DeleteResult>;
}
