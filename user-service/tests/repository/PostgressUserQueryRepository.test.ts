import { randomUUID } from 'crypto';

import prisma from '../../src/prisma';
import { User } from 'domain/User';
import { PostgressUserQueryRepository } from 'repository/PostgressUserQueryRepository';

describe('User Query Repository - find user by id', () => {
  const repo = new PostgressUserQueryRepository();
  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('should return the user when a matching UUID exists', async () => {
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

  test('should return user with empty lastName when stored lastName is null', async () => {
    const created = await prisma.user.create({
      data: {
        firstName: 'Ari',
        // omit lastName so it is null in DB
      } as any,
    } as any);

    const found = await repo.getById(created.id);

    const expected = new User(created.id, 'Ari', '', created.createdAt, created.updatedAt);
    expect(found).toEqual(expected);
  });

  test('should return undefined when no user exists for the UUID', async () => {
    const missingId = randomUUID();

    const found = await repo.getById(missingId);

    expect(found).toBeUndefined();
  });

  test('should throw on invalid UUID input', async () => {
    await expect(repo.getById('not-a-uuid')).rejects.toThrow('Invalid UUID');
  });
});
