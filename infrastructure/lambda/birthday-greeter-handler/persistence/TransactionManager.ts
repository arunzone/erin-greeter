import { Kysely, Transaction } from 'kysely';
import { Database } from '../types';

export type KyselyTrx = Transaction<Database>;

export class TransactionManager {
  constructor(private db: Kysely<Database>) {}

  async runInTransaction<T>(callback: (trx: KyselyTrx) => Promise<T>): Promise<T> {
    return this.db.transaction().execute(callback);
  }
}
