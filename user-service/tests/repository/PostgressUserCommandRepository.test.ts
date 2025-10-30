import { randomUUID } from 'crypto';

import { User } from 'domain/User';
import { NotFoundError } from 'errors/HttpError';
import { PostgressUserCommandRepository } from 'repository/PostgressUserCommandRepository';

import prisma from '../../src/prisma';

describe('User Command Repository - create user', () => {
  const repo = new PostgressUserCommandRepository(prisma);
  const createdUserIds: string[] = [];

  afterEach(async () => {
    // Clean up any users created during tests
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
      createdUserIds.length = 0;
    }
  });

  test('should create and return the persisted user', async () => {
    const data = {
      firstName: 'Erin',
      lastName: 'Example',
      timeZone: 'Australia/Sydney',
      birthday: new Date('2024-01-01'),
    } as any;

    const created = await repo.create(data);
    createdUserIds.push(created.id);

    const expected = new User(
      created.id,
      'Erin',
      'Example',
      'Australia/Sydney',
      created.createdAt,
      created.updatedAt,
      created.birthday,
    );

    expect(created).toEqual(expected);
  });

  test('should create user without lastName and maps it to undefined', async () => {
    const data = { firstName: 'Erin', timeZone: 'Australia/Sydney' } as any;

    const created = await repo.create(data as any);
    createdUserIds.push(created.id);

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

describe('User Command Repository - update user', () => {
  const repo = new PostgressUserCommandRepository(prisma);
  let createdUserId: string; // To store the ID of user created for tests

  beforeEach(async () => {
    // Create a fresh user before each test to ensure it exists
    const data = {
      firstName: 'UpdateTest',
      lastName: 'User',
      timeZone: 'America/New_York',
    };
    const created = await prisma.user.create({ data });
    createdUserId = created.id;
  });

  afterEach(async () => {
    // Clean up the user after each test
    await prisma.user.deleteMany({ where: { id: createdUserId } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('should update an existing user and return the updated user', async () => {
    const updateData = {
      firstName: 'UpdatedFirstName',
      lastName: 'UpdatedLastName',
      timeZone: 'America/Los_Angeles',
    };

    const updated = await repo.update(createdUserId, updateData as any);

    const dbUser = await prisma.user.findUnique({ where: { id: createdUserId } });
    expect(dbUser).toEqual(expect.objectContaining({
      id: createdUserId,
      firstName: updateData.firstName,
      lastName: updateData.lastName,
      timeZone: updateData.timeZone,
      birthday: null,
    }));
  });

  test('should throw NotFoundError if user to update does not exist', async () => {
    const missingId = randomUUID();
    const updateData = {
      firstName: 'NonExistent',
      lastName: 'User',
      timeZone: 'Europe/London',
    };

    await expect(repo.update(missingId, updateData as any)).rejects.toThrow(NotFoundError);
    await expect(repo.update(missingId, updateData as any)).rejects.toThrow(`User with id ${missingId} not found`);
  });
});
