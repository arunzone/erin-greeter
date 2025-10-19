import { User } from 'domain/User';
import { UserCommandRepository, CreateUserDto } from 'repositories/interface/UserCommandRepository';

import prisma from '../prisma';

export class PostgressUserCommandRepository implements UserCommandRepository<User> {
  constructor(private readonly db = prisma) {}
  async create(data: CreateUserDto): Promise<User> {
    const created = await this.db.user.create({
      data,
    });
    return new User(
      created.id,
      created.firstName,
      created.lastName,
      created.createdAt,
      created.updatedAt,
    );
  }
}
