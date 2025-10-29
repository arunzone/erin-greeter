import { DeleteResult, Kysely } from 'kysely';
import { Database, User, NewUser, UpdateUser, KyselyTrx } from '../types';

import { DatabaseConnectionManager } from './DatabaseConnectionManager';
import { UserRepository } from './UserRepository';

export class PostgresUserRepository implements UserRepository<User, NewUser, UpdateUser> {
  constructor(private dbManager: DatabaseConnectionManager) {}

  private get db(): Kysely<Database> {
    return this.dbManager.getDatabase();
  }

  async findAllUsers(): Promise<User[]> {
    await this.dbManager.ensureConnection();
    return await this.db.selectFrom('user').selectAll().execute();
  }

  async findUserById(id: string): Promise<User | undefined> {
    await this.dbManager.ensureConnection();

    return await this.db.selectFrom('user').selectAll().where('id', '=', id).executeTakeFirst();
  }

  async createUser(userData: NewUser, trx: KyselyTrx): Promise<User> {
    return await trx.insertInto('user').values(userData).returningAll().executeTakeFirstOrThrow();
  }

  async updateUser(id: string, userData: UpdateUser, trx: KyselyTrx): Promise<User> {
    return await trx
      .updateTable('user')
      .set(userData)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async deleteUser(id: string, trx: KyselyTrx): Promise<DeleteResult> {
    return await trx.deleteFrom('user').where('id', '=', id).executeTakeFirst();
  }
}
