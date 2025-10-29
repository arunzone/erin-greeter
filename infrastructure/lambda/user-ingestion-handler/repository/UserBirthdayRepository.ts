import { KyselyTrx } from '../types';
import { DeleteResult } from 'kysely';

export interface UserBirthdayRepository<TSelect, TInsert, TUpdate, TFind> {
  // Read methods use the TSelect (Output) type
  findAllBirthdays(): Promise<TSelect[]>;
  findUserBirthdayByUserId(userId: string): Promise<TSelect | undefined>;
  findUserBirthdayByDayMonthTimezone(
    day: number,
    month: number,
    timezone: string
  ): Promise<TFind | undefined>;

  // Write methods use the TInsert (Input) type, but still return TSelect (the final inserted object)
  createUserBirthday(userBirthday: TInsert, trx: KyselyTrx): Promise<TSelect>;
  updateUserBirthday(userId: string, userBirthday: TUpdate, trx: KyselyTrx): Promise<TSelect>;
  deleteUserBirthday(userId: string, trx: KyselyTrx): Promise<DeleteResult>;
}
