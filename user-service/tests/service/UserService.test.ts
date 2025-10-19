import { jest } from '@jest/globals';

import { User } from 'domain/User';
import { CreateUserDto, UserCommandRepository } from 'repository/interface/UserCommandRepository';
import UserService from 'service/UserService';
import { NotFoundError } from 'errors/HttpError';

describe('UserService.create', () => {
  const makeRepo = () => {
    const repo = {
      create: jest.fn(),
      deleteById: jest.fn(),
    } as unknown as UserCommandRepository<User> & {
      create: jest.MockedFunction<UserCommandRepository<User>['create']>;
      deleteById: jest.MockedFunction<UserCommandRepository<User>['deleteById']>;
    };
    return repo;
  };

  test('creates a user calls repository with given user details', async () => {
    const repo = makeRepo();
    const service = new UserService(repo);

    const dto: CreateUserDto = { firstName: 'Erin', lastName: 'Example', timeZone: 'Australia/Sydney' };
    const expected = new User(
      '9122BAFC-45E0-4CCA-94A1-5F33934536FC',
      'Erin',
      'Example',
      'Australia/Sydney',
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

    const dto: CreateUserDto = { firstName: 'Erin', lastName: 'Example', timeZone: 'Australia/Sydney' };
    const expected = new User(
      '9122BAFC-45E0-4CCA-94A1-5F33934536FC',
      'Erin',
      'Example',
      'Australia/Sydney',
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

    const dto: CreateUserDto = { firstName: 'Erin', timeZone: 'Australia/Sydney' } as any;
    const err = new Error('db down');
    repo.create.mockRejectedValueOnce(err);

    await expect(service.create(dto)).rejects.toThrow('db down');
    expect(repo.create).toHaveBeenCalledWith(dto);
  });

  test('should call deleteById on repository when deleting a user', async () => {
    const repo = makeRepo();
    const service = new UserService(repo);

    repo.deleteById.mockResolvedValueOnce(true);

    await service.delete('123e4567-e89b-12d3-a456-426614174000');

    expect(repo.deleteById).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
  });

  test('should throw NotFoundError when repository returns false', async () => {
    const repo = makeRepo();
    const service = new UserService(repo);

    repo.deleteById.mockResolvedValueOnce(false);

    await expect(
      service.delete('123e4567-e89b-12d3-a456-426614174000'),
    ).rejects.toBeInstanceOf(NotFoundError);
    
  });
});
