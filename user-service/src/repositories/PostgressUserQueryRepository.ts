import prisma from '../prisma';
import { uuidSchema } from '../validation/zod';
import { UserQueryRepository } from 'repositories/interface/UserQueryRepository';
import { User } from 'domain/User';

export class PostgressUserQueryRepository implements UserQueryRepository<User> {
  constructor(private readonly db = prisma) {}
  async getById(id: string): Promise<User | null> {
    this.validateUserId(id);
    const found = await this.db.user.findUnique({ where: { id } });
    if (!found) return null;
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
