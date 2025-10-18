import { UserRepository } from 'repositories/UserRepository';
import prisma from '@db/prisma';
import { randomUUID } from 'crypto';

describe('UserRepository.getUserById', () => {
  const repo = new UserRepository();
  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('returns the user when a matching UUID exists', async () => {
    const created = await prisma.user.create({
      data: ({
        firstName: 'Erin',
        lastName: 'Example',
      } as any),
    } as any);

    const found = await repo.getUserById(created.id);

    expect(found).toEqual(created);
  });

  test('returns null when no user exists for the UUID', async () => {
    const missingId = randomUUID();

    const found = await repo.getUserById(missingId);
    
    expect(found).toBeNull();
  });

  test('throws on invalid UUID input', async () => {
    await expect(repo.getUserById('not-a-uuid'))
      .rejects
      .toThrow('Invalid UUID');
  });
});
