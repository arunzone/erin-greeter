import { ColumnType, Selectable, Generated, Updateable } from 'kysely';

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

export type UserBirthday = Selectable<UserBirthdayTable>;
export type UpdateUserBirthday = Updateable<UserBirthdayTable>;

export interface GreetingPayload {
  message: string;
  userId: string;
  timestamp: string;
}
