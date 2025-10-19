import { PrismaClient } from '@prisma/client';
import { inject, injectable } from 'inversify';

import { TYPES } from '../di/types.js';
import { User } from '../domain/User.js';
import { UserQueryRepository } from './interface/UserQueryRepository.js';
import { uuidSchema } from '../validation/zod.js';

import prisma from '../prisma.js';

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
      found.lastName ?? undefined,
      found.timeZone,
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
