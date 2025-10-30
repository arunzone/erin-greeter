import { Kysely } from 'kysely';
import { Database } from '../types';
import { DatabaseConnectionManager } from './DatabaseConnectionManager';
import { BirthdayGreetingRepository } from './BirthdayGreetingRepository';
import { KyselyTrx } from '../persistence/TransactionManager';

export class PostgresBirthdayGreetingRepository implements BirthdayGreetingRepository {
  constructor(private dbManager: DatabaseConnectionManager) {}

  private get db(): Kysely<Database> {
    return this.dbManager.getDatabase();
  }

  async updateSentYear(userId: string, year: number, trx?: KyselyTrx): Promise<boolean> {
    await this.dbManager.ensureConnection();

    const queryBuilder = trx || this.db;

    const result = await queryBuilder
      .updateTable('user_birthday')
      .set({ sent_year: year })
      .where('user_id', '=', userId)
      .where(expressionBuilder =>
        expressionBuilder.or([
          expressionBuilder('sent_year', 'is', null),
          expressionBuilder('sent_year', '<', year),
        ])
      )
      .returning('id')
      .executeTakeFirst();

    return result !== undefined;
  }
}
