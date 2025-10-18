import prisma from '../prisma';
import { uuidSchema } from '../validation/zod';

export class UserRepository {
  constructor(private readonly db = prisma) {}

  async getUserById(id: string) {
    const parsed = uuidSchema.safeParse(id);
    if (!parsed.success) {
      throw new Error('Invalid UUID');
    }
    return this.db.user.findUnique({ where: { id } });
  }
}
