import { User } from 'domain/User';
import { UserQueryRepository } from 'repositories/interface/UserQueryRepository';
import { uuidSchema } from 'validation/zod';

import prisma from '../prisma';

export class PostgressUserQueryRepository implements UserQueryRepository<User> {
  constructor(private readonly db = prisma) {}
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
