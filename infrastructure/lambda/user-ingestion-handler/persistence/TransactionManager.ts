import { Kysely } from 'kysely';
import { Database, KyselyTrx } from '../types';

export class TransactionManager {
  constructor(private db: Kysely<Database>) {}

  async runInTransaction<T>(callback: (trx: KyselyTrx) => Promise<T>): Promise<T> {
    return this.db.transaction().execute(callback);
  }
}
