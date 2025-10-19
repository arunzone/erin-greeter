import { randomUUID } from 'crypto';

import prisma from '@db/prisma';
import { PostgressUserQueryRepository } from '@db/repositories/PostgressUserQueryRepository';
import { User } from 'domain/User';

describe('User Query Repository - find user by id', () => {
  const repo = new PostgressUserQueryRepository();
  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('returns the user when a matching UUID exists', async () => {
    const created = await prisma.user.create({
      data: {
        firstName: 'Erin',
        lastName: 'Example',
      } as any,
    } as any);

    const found = await repo.getById(created.id);

    const expected = new User(created.id, 'Erin', 'Example', created.createdAt, created.updatedAt);
    expect(found).toEqual(expected);
  });

  test('returns null when no user exists for the UUID', async () => {
    const missingId = randomUUID();

    const found = await repo.getById(missingId);

    expect(found).toBeNull();
  });

  test('throws on invalid UUID input', async () => {
    await expect(repo.getById('not-a-uuid')).rejects.toThrow('Invalid UUID');
  });
});
