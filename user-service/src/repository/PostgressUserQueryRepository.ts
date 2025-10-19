import { PrismaClient } from '@prisma/client';
import { inject, injectable } from 'inversify';

import { TYPES } from 'di/types';
import { User } from 'domain/User';
import { UserQueryRepository } from 'repository/interface/UserQueryRepository';
import { uuidSchema } from 'validation/zod';

import prisma from '../prisma';

@injectable()
export class PostgressUserQueryRepository implements UserQueryRepository<User> {
  private readonly db: PrismaClient;
  constructor(@inject(TYPES.Prisma) db?: PrismaClient) {
    this.db = db ?? prisma;
  }
  async getById(id: string): Promise<User | undefined> {
    this.validateUserId(id);
    const found = await this.db.user.findUnique({ where: { id } });
    if (!found) return undefined;
    return new User(
      found.id,
      found.firstName,
      found.lastName ?? '',
      found.createdAt,
      found.updatedAt,
    );
  }

  private validateUserId(id: string) {
    const parsed = uuidSchema.safeParse(id);
    if (!parsed.success) {
      throw new Error('Invalid UUID');
    }
  }
}
