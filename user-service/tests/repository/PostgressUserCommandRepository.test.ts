import prisma from '../../src/prisma';
import { User } from 'domain/User';
import { PostgressUserCommandRepository } from 'repository/PostgressUserCommandRepository';
import { randomUUID } from 'crypto';

describe('User Command Repository - create user', () => {
  const repo = new PostgressUserCommandRepository();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('should create and return the persisted user', async () => {
    const data = { firstName: 'Erin', lastName: 'Example', timeZone: 'Australia/Sydney' } as any;

    const created = await repo.create(data);

    const expected = new User(
      created.id,
      'Erin',
      'Example',
      'Australia/Sydney',
      created.createdAt,
      created.updatedAt,
    );

    expect(created).toEqual(expected);
  });

  test('should create user without lastName and maps it to undefined', async () => {
    const data = { firstName: 'Erin', timeZone: 'Australia/Sydney' } as any;

    const created = await repo.create(data as any);

    const expected = new User(
      created.id,
      'Erin',
      undefined,
      'Australia/Sydney',
      created.createdAt,
      created.updatedAt,
    );

    expect(created).toEqual(expected);
  });

  test('should throw when given invalid data that violates domain rules', async () => {
    await expect(
      repo.create({ firstName: '', lastName: 'Example', timeZone: 'Australia/Sydney' }) as any,
    ).rejects.toThrow();
  });

  test('should delete an existing user and return true', async () => {
    const created = await prisma.user.create({
      data: { firstName: 'Del', lastName: 'User', timeZone: 'Australia/Sydney' } as any,
    } as any);

    const result = await repo.deleteById(created.id);

    expect(result).toBe(true);
    const shouldBeGone = await prisma.user.findUnique({ where: { id: created.id } } as any);
    expect(shouldBeGone).toBeNull();
  });

  test('should return false when deleting a non-existent user id', async () => {
    const missingId = randomUUID();

    const result = await repo.deleteById(missingId);

    expect(result).toBe(false);
  });
});
