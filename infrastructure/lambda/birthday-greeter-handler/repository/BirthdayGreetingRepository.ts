import { UpdateResult } from 'kysely';

export interface BirthdayGreetingRepository {
  updateSentYear(userId: string, year: number): Promise<boolean>;
}
