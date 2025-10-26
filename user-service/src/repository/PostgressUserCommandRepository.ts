import { PrismaClient } from '@prisma/client';
import { inject, injectable } from 'inversify';

import { TYPES } from 'di/types.js';
import { User } from 'domain/User.js';
import {
  UserCommandRepository,
  CreateUserDto,
} from 'repository/interface/UserCommandRepository.js';

import prisma from '../prisma.js';

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
      created.timeZone,
      created.createdAt,
      created.updatedAt,
      (created as any).birthday ?? undefined,
    );
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.db.user.deleteMany({ where: { id } });
    return result.count > 0;
  }
}
