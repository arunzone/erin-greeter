import { Kysely } from 'kysely';
import { Database, UserTable, User } from '../types';

import { DatabaseConnectionManager } from './DatabaseConnectionManager';
import { UserRepository } from './UserRepository';

export class PostgresUserRepository implements UserRepository<User> {
  constructor(private dbManager: DatabaseConnectionManager) {}

  private get db(): Kysely<Database> {
    return this.dbManager.getDatabase();
  }

  async findAllUsers(): Promise<User[]> {
    await this.dbManager.ensureConnection();
    return await this.db
      .selectFrom('user')
      .selectAll()
      .execute();
  }

  async findUserById(id: string): Promise<User | undefined> { 
    await this.dbManager.ensureConnection();

    return await this.db
      .selectFrom('user')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
}

  async createUser(userData: {
    id: string;
    first_name: string;
    last_name: string;
    birthday?: string;
    timezone: string;
  }): Promise<User> {
    await this.dbManager.ensureConnection();

    return await this.db
      .insertInto('user')
      .values(userData)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
