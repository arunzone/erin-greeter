import { PrismaClient } from '@prisma/client';
import { inject, injectable } from 'inversify';

import { TYPES } from 'di/types';
import { User } from 'domain/User';
import { UserCommandRepository, CreateUserDto } from 'repository/interface/UserCommandRepository';

import prisma from '../prisma';

@injectable()
export class PostgressUserCommandRepository implements UserCommandRepository<User> {
  private readonly db: PrismaClient;
  constructor(@inject(TYPES.Prisma) db?: PrismaClient) {
    this.db = db ?? prisma;
  }
  async create(data: CreateUserDto): Promise<User> {
    const created = await this.db.user.create({
      data,
    });
    return new User(
      created.id,
      created.firstName,
      created.lastName ?? undefined,
      created.createdAt,
      created.updatedAt,
    );
  }
}
