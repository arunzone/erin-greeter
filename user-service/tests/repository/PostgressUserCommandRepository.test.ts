import prisma from '@db/prisma';
import { PostgressUserCommandRepository } from 'repository/PostgressUserCommandRepository';
import { User } from 'domain/User';

describe('User Command Repository - create user', () => {
  const repo = new PostgressUserCommandRepository();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('creates and returns the persisted user', async () => {
    const data = { firstName: 'Erin', lastName: 'Example' };

    const created = await repo.create(data);

    const expected = new User(created.id, 'Erin', 'Example', created.createdAt, created.updatedAt);

    expect(created).toEqual(expected);
  });

  test('throws when given invalid data that violates domain rules', async () => {
    await expect(repo.create({ firstName: '', lastName: 'Example' }) as any).rejects.toThrow();
  });
});
