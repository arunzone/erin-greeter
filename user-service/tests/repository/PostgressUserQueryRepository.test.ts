import { randomUUID } from 'crypto';

import { User } from 'domain/User';
import { BadRequestError } from 'errors/HttpError';
import { PostgressUserQueryRepository } from 'repository/PostgressUserQueryRepository';

import prisma from '../../src/prisma';

describe('User Query Repository - find user by id', () => {
  const repo = new PostgressUserQueryRepository(prisma);
  const createdUserIds: string[] = [];

  afterEach(async () => {
    // Clean up any users created during tests
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
      createdUserIds.length = 0;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('should return the user when a matching UUID exists', async () => {
    const created = await prisma.user.create({
      data: {
        firstName: 'Erin',
        lastName: 'Example',
        timeZone: 'Australia/Sydney',
        birthday: new Date('2024-01-01'),
      } as any,
    } as any);
    createdUserIds.push(created.id);

    const found = await repo.getById(created.id);

    const expected = new User(
      created.id,
      'Erin',
      'Example',
      'Australia/Sydney',
      created.createdAt,
      created.updatedAt,
      created.birthday ?? undefined,
    );
    expect(found).toEqual(expected);
  });

  test('should return user with empty lastName when stored lastName is null', async () => {
    const created = await prisma.user.create({
      data: {
        firstName: 'Ari',
        // omit lastName so it is null in DB
        timeZone: 'Australia/Sydney',
      } as any,
    } as any);
    createdUserIds.push(created.id);

    const found = await repo.getById(created.id);

    const expected = new User(
      created.id,
      'Ari',
      undefined,
      'Australia/Sydney',
      created.createdAt,
      created.updatedAt,
    );
    expect(found).toEqual(expected);
  });

  test('should return undefined when no user exists for the UUID', async () => {
    const missingId = randomUUID();

    const found = await repo.getById(missingId);

    expect(found).toBeUndefined();
  });

  test('should throw on invalid UUID input', async () => {
    await expect(repo.getById('not-a-uuid')).rejects.toThrow(BadRequestError);
    await expect(repo.getById('not-a-uuid')).rejects.toThrow('Invalid user ID: must be a valid UUID');
  });
});
