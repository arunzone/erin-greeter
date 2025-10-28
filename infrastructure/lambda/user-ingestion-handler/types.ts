import { ColumnType, Generated, Insertable, Selectable, Transaction } from 'kysely';

export interface UserTable {
  id: string;
  first_name: string;
  last_name?: string;
  created_at: ColumnType<Date, never, never>;
}

export interface UserBirthdayTable {
  id: Generated<string>;
  user_id: string;
  day: number;
  month: number;
  year: number;
  sent_year?: number;
  timezone: string;
  created_at: ColumnType<Date, never, never>;
}

export interface Database {
  user: UserTable;
  user_birthday: UserBirthdayTable;
}

export type User = Selectable<UserTable>;
export type UserBirthday = Selectable<UserBirthdayTable>;
export type NewUser = Insertable<UserTable>;
export type NewUserBirthday = Insertable<UserBirthdayTable>;
export type KyselyTrx = Transaction<Database>;

export type BirthdayRecord = {
  userId: string;
  first_name: string;
  last_name?: string;
  timezone: string;
  month: number;
  day: number;
  sent_year?: number;
}[];

export enum EventType {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
}
