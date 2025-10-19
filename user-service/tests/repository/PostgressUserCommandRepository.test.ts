import prisma from '../../src/prisma';
import { User } from 'domain/User';
import { PostgressUserCommandRepository } from 'repository/PostgressUserCommandRepository';

describe('User Command Repository - create user', () => {
  const repo = new PostgressUserCommandRepository();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('should create and return the persisted user', async () => {
    const data = { firstName: 'Erin', lastName: 'Example' };

    const created = await repo.create(data);

    const expected = new User(created.id, 'Erin', 'Example', created.createdAt, created.updatedAt);

    expect(created).toEqual(expected);
  });

  test('should create user without lastName and maps it to undefined', async () => {
    const data = { firstName: 'Erin' };

    const created = await repo.create(data as any);

    const expected = new User(created.id, 'Erin', undefined, created.createdAt, created.updatedAt);

    expect(created).toEqual(expected);
  });

  test('should throw when given invalid data that violates domain rules', async () => {
    await expect(repo.create({ firstName: '', lastName: 'Example' }) as any).rejects.toThrow();
  });
});
