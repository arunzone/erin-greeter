import { jest } from '@jest/globals';

import { User } from 'domain/User';
import { CreateUserDto, UserCommandRepository } from 'repository/interface/UserCommandRepository';
import UserService from 'service/UserService';

describe('UserService.create', () => {
  const makeRepo = () => {
    const repo = {
      create: jest.fn(),
    } as unknown as UserCommandRepository<User> & {
      create: jest.MockedFunction<UserCommandRepository<User>['create']>;
    };
    return repo;
  };

  test('creates a user calls repository with given user details', async () => {
    const repo = makeRepo();
    const service = new UserService(repo);

    const dto: CreateUserDto = { firstName: 'Erin', lastName: 'Example' };
    const expected = new User(
      '9122BAFC-45E0-4CCA-94A1-5F33934536FC',
      'Erin',
      'Example',
      new Date('2024-01-01'),
      new Date('2024-01-02'),
    );

    repo.create.mockResolvedValueOnce(expected);

    await service.create(dto);

    expect(repo.create).toHaveBeenCalledWith(dto);
  });

  test('creates a user returns created user', async () => {
    const repo = makeRepo();
    const service = new UserService(repo);

    const dto: CreateUserDto = { firstName: 'Erin', lastName: 'Example' };
    const expected = new User(
      '9122BAFC-45E0-4CCA-94A1-5F33934536FC',
      'Erin',
      'Example',
      new Date('2024-01-01'),
      new Date('2024-01-02'),
    );

    repo.create.mockResolvedValueOnce(expected);

    const result = await service.create(dto);

    expect(result).toBe(expected);
  });

  test('propagates repository errors', async () => {
    const repo = makeRepo();
    const service = new UserService(repo);

    const dto: CreateUserDto = { firstName: 'Erin' };
    const err = new Error('db down');
    repo.create.mockRejectedValueOnce(err);

    await expect(service.create(dto)).rejects.toThrow('db down');
    expect(repo.create).toHaveBeenCalledWith(dto);
  });
});
