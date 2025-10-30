import { KyselyTrx } from '../persistence/TransactionManager';

export interface BirthdayGreetingRepository {
  updateSentYear(userId: string, year: number, trx?: KyselyTrx): Promise<boolean>;
}
