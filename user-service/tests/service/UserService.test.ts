import { jest } from '@jest/globals';

import { User } from 'domain/User';
import { UserEventType } from 'domain/UserEventType';
import { NotFoundError } from 'errors/HttpError';
import { CreateUserDto, UserCommandRepository } from 'repository/interface/UserCommandRepository';
import { UserQueryRepository } from 'repository/interface/UserQueryRepository';
import { SqsService } from 'service/interface/SqsService';
import UserService from 'service/UserService';
import { UpdateUserDto } from 'controller/dto/UpdateUserDto';

describe('UserService.create', () => {
  const makeCommandRepo = () => {
    const repo = {
      create: jest.fn(),
      deleteById: jest.fn(),
      update: jest.fn(),
    } as unknown as UserCommandRepository<User> & {
      create: jest.MockedFunction<UserCommandRepository<User>['create']>;
      deleteById: jest.MockedFunction<UserCommandRepository<User>['deleteById']>;
      update: jest.MockedFunction<UserCommandRepository<User>['update']>;
    };
    return repo;
  };

  const makeQueryRepo = () => {
    const repo = {
      getById: jest.fn(),
    } as unknown as UserQueryRepository<User> & {
      getById: jest.MockedFunction<UserQueryRepository<User>['getById']>;
    };
    return repo;
  };

  const makeSqsService = () => {
    const sqsService = {
      sendUserEvent: jest.fn(),
    } as unknown as SqsService & {
      sendUserEvent: jest.MockedFunction<SqsService['sendUserEvent']>;
    };
    return sqsService;
  };

  const makeService = (
    commandRepo?: UserCommandRepository<User>,
    queryRepo?: UserQueryRepository<User>,
    sqsService?: SqsService,
  ) => {
    return new UserService(
      commandRepo || makeCommandRepo(),
      queryRepo || makeQueryRepo(),
      sqsService || makeSqsService(),
    );
  };

  test('should call repository with given user details on create', async () => {
    const repo = makeCommandRepo();
    const sqsService = makeSqsService();
    const service = makeService(repo, undefined, sqsService);

    const dto: CreateUserDto = {
      firstName: 'Erin',
      lastName: 'Example',
      timeZone: 'Australia/Sydney',
    };
    const expected = new User(
      '9122BAFC-45E0-4CCA-94A1-5F33934536FC',
      'Erin',
      'Example',
      'Australia/Sydney',
      new Date('2024-01-01'),
      new Date('2024-01-02'),
      undefined,
    );

    repo.create.mockResolvedValueOnce(expected);

    await service.create(dto);

    expect(repo.create).toHaveBeenCalledWith(dto);
  });

  test('should return user when a user is created', async () => {
    const repo = makeCommandRepo();
    const sqsService = makeSqsService();
    const service = makeService(repo, undefined, sqsService);

    const dto: CreateUserDto = {
      firstName: 'Erin',
      lastName: 'Example',
      timeZone: 'Australia/Sydney',
    };
    const expected = new User(
      '9122BAFC-45E0-4CCA-94A1-5F33934536FC',
      'Erin',
      'Example',
      'Australia/Sydney',
      new Date('2024-01-01'),
      new Date('2024-01-02'),
      undefined,
    );

    repo.create.mockResolvedValueOnce(expected);

    const result = await service.create(dto);

    expect(result).toBe(expected);
  });

  test('should send SQS event when a user is created', async () => {
    const repo = makeCommandRepo();
    const sqsService = makeSqsService();
    const service = makeService(repo, undefined, sqsService);

    const dto: CreateUserDto = {
      firstName: 'Erin',
      lastName: 'Example',
      timeZone: 'Australia/Sydney',
    };
    const expected = new User(
      '9122BAFC-45E0-4CCA-94A1-5F33934536FC',
      'Erin',
      'Example',
      'Australia/Sydney',
      new Date('2024-01-01'),
      new Date('2024-01-02'),
      undefined,
    );

    repo.create.mockResolvedValueOnce(expected);

    await service.create(dto);

    expect(sqsService.sendUserEvent).toHaveBeenCalledWith(expected, UserEventType.CREATED);
  });

  test('should send SQS event once when a user is created', async () => {
    const repo = makeCommandRepo();
    const sqsService = makeSqsService();
    const service = makeService(repo, undefined, sqsService);

    const dto: CreateUserDto = {
      firstName: 'Erin',
      lastName: 'Example',
      timeZone: 'Australia/Sydney',
    };
    const expected = new User(
      '9122BAFC-45E0-4CCA-94A1-5F33934536FC',
      'Erin',
      'Example',
      'Australia/Sydney',
      new Date('2024-01-01'),
      new Date('2024-01-02'),
      undefined,
    );

    repo.create.mockResolvedValueOnce(expected);

    await service.create(dto);

    expect(sqsService.sendUserEvent).toHaveBeenCalledTimes(1);
  });

  test('should propagate repository errors', async () => {
    const repo = makeCommandRepo();
    const sqsService = makeSqsService();
    const service = makeService(repo, undefined, sqsService);

    const dto: CreateUserDto = { firstName: 'Erin', timeZone: 'Australia/Sydney' } as any;
    const err = new Error('db down');
    repo.create.mockRejectedValueOnce(err);

    await expect(service.create(dto)).rejects.toThrow('db down');
    expect(repo.create).toHaveBeenCalledWith(dto);
  });

  test('should call deleteById on repository when deleting a user', async () => {
    const commandRepo = makeCommandRepo();
    const queryRepo = makeQueryRepo();
    const sqsService = makeSqsService();
    const service = makeService(commandRepo, queryRepo, sqsService);

    const user = new User(
      '123e4567-e89b-12d3-a456-426614174000',
      'Test',
      'User',
      'Australia/Sydney',
      new Date('2024-01-01'),
      new Date('2024-01-02'),
      undefined,
    );

    queryRepo.getById.mockResolvedValueOnce(user);

    commandRepo.deleteById.mockResolvedValueOnce(true);

    await service.delete('123e4567-e89b-12d3-a456-426614174000');

    expect(commandRepo.deleteById).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
  });

  test('should throw NotFoundError when repository returns false', async () => {
    const commandRepo = makeCommandRepo();
    const queryRepo = makeQueryRepo();
    const sqsService = makeSqsService();
    const service = makeService(commandRepo, queryRepo, sqsService);

    commandRepo.deleteById.mockResolvedValueOnce(false);

    await expect(service.delete('123e4567-e89b-12d3-a456-426614174000')).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  test('should send SQS event when a user is deleted', async () => {
    const commandRepo = makeCommandRepo();
    const queryRepo = makeQueryRepo();
    const sqsService = makeSqsService();
    const service = makeService(commandRepo, queryRepo, sqsService);

    const user = new User(
      '123e4567-e89b-12d3-a456-426614174000',
      'Test',
      'User',
      'Australia/Sydney',
      new Date('2024-01-01'),
      new Date('2024-01-02'),
    );

    queryRepo.getById.mockResolvedValueOnce(user);

    commandRepo.deleteById.mockResolvedValueOnce(true);

    await service.delete('123e4567-e89b-12d3-a456-426614174000');

    expect(sqsService.sendUserEvent).toHaveBeenCalledWith(user, UserEventType.DELETED);
  });

  test('should send SQS event once when a user is deleted', async () => {
    const commandRepo = makeCommandRepo();
    const queryRepo = makeQueryRepo();
    const sqsService = makeSqsService();
    const service = makeService(commandRepo, queryRepo, sqsService);

    const user = new User(
      '123e4567-e89b-12d3-a456-426614174000',
      'Test',
      'User',
      'Australia/Sydney',
      new Date('2024-01-01'),
      new Date('2024-01-02'),
    );

    queryRepo.getById.mockResolvedValueOnce(user);
    commandRepo.deleteById.mockResolvedValueOnce(true);

    await service.delete('123e4567-e89b-12d3-a456-426614174000');

    expect(sqsService.sendUserEvent).toHaveBeenCalledTimes(1);
  });

  test('should throw NotFoundError when user not found for deletion', async () => {
    const commandRepo = makeCommandRepo();
    const queryRepo = makeQueryRepo();
    const sqsService = makeSqsService();
    const service = makeService(commandRepo, queryRepo, sqsService);

    queryRepo.getById.mockResolvedValueOnce(undefined);

    await expect(service.delete('123e4567-e89b-12d3-a456-426614174000')).rejects.toBeInstanceOf(
      NotFoundError,
    );

    expect(commandRepo.deleteById).not.toHaveBeenCalled();
    expect(sqsService.sendUserEvent).not.toHaveBeenCalled();
  });
});

describe('UserService.update', () => {
  const makeCommandRepo = () => {
    const repo = {
      create: jest.fn(),
      deleteById: jest.fn(),
      update: jest.fn(),
    } as unknown as UserCommandRepository<User> & {
      create: jest.MockedFunction<UserCommandRepository<User>['create']>;
      deleteById: jest.MockedFunction<UserCommandRepository<User>['deleteById']>;
      update: jest.MockedFunction<UserCommandRepository<User>['update']>;
    };
    return repo;
  };

  const makeQueryRepo = () => {
    const repo = {
      getById: jest.fn(),
    } as unknown as UserQueryRepository<User> & {
      getById: jest.MockedFunction<UserQueryRepository<User>['getById']>;
    };
    return repo;
  };

  const makeSqsService = () => {
    const sqsService = {
      sendUserEvent: jest.fn(),
    } as unknown as SqsService & {
      sendUserEvent: jest.MockedFunction<SqsService['sendUserEvent']>;
    };
    return sqsService;
  };

  const makeService = (
    commandRepo?: UserCommandRepository<User>,
    queryRepo?: UserQueryRepository<User>,
    sqsService?: SqsService,
  ) => {
    return new UserService(
      commandRepo || makeCommandRepo(),
      queryRepo || makeQueryRepo(),
      sqsService || makeSqsService(),
    );
  };

  const existingUser = new User(
    '123e4567-e89b-12d3-a456-426614174000',
    'OldFirstName',
    'OldLastName',
    'Australia/Sydney',
    new Date('2024-01-01'),
    new Date('2024-01-02'),
  );

  test('should call repository with given user details on update', async () => {
    const commandRepo = makeCommandRepo();
    const queryRepo = makeQueryRepo();
    const sqsService = makeSqsService();
    const service = makeService(commandRepo, queryRepo, sqsService);

    queryRepo.getById.mockResolvedValueOnce(existingUser);
    commandRepo.update.mockResolvedValueOnce(existingUser);

    const updateDto: UpdateUserDto = {
      firstName: 'NewFirstName',
      lastName: 'NewLastName',
      timeZone: 'America/New_York',
    };

    await service.update(existingUser.id, updateDto);

    expect(queryRepo.getById).toHaveBeenCalledWith(existingUser.id);
    expect(commandRepo.update).toHaveBeenCalledWith(existingUser.id, updateDto);
  });

  test('should return updated user when a user is updated', async () => {
    const commandRepo = makeCommandRepo();
    const queryRepo = makeQueryRepo();
    const sqsService = makeSqsService();
    const service = makeService(commandRepo, queryRepo, sqsService);

    const updatedUser = new User(
      existingUser.id,
      'NewFirstName',
      'NewLastName',
      'America/New_York',
      existingUser.createdAt,
      new Date('2024-01-03'),
    );

    queryRepo.getById.mockResolvedValueOnce(existingUser);
    commandRepo.update.mockResolvedValueOnce(updatedUser);

    const updateDto: UpdateUserDto = {
      firstName: 'NewFirstName',
      lastName: 'NewLastName',
      timeZone: 'America/New_York',
    };

    const result = await service.update(existingUser.id, updateDto);

    expect(result).toBe(updatedUser);
  });

  test('should send SQS event when a user is updated', async () => {
    const commandRepo = makeCommandRepo();
    const queryRepo = makeQueryRepo();
    const sqsService = makeSqsService();
    const service = makeService(commandRepo, queryRepo, sqsService);

    const updatedUser = new User(
      existingUser.id,
      'NewFirstName',
      'NewLastName',
      'America/New_York',
      existingUser.createdAt,
      new Date('2024-01-03'),
    );

    queryRepo.getById.mockResolvedValueOnce(existingUser);
    commandRepo.update.mockResolvedValueOnce(updatedUser);

    const updateDto: UpdateUserDto = {
      firstName: 'NewFirstName',
      lastName: 'NewLastName',
      timeZone: 'America/New_York',
    };

    await service.update(existingUser.id, updateDto);

    expect(sqsService.sendUserEvent).toHaveBeenCalledWith(updatedUser, UserEventType.UPDATED);
  });

  test('should send SQS event once when a user is updated', async () => {
    const commandRepo = makeCommandRepo();
    const queryRepo = makeQueryRepo();
    const sqsService = makeSqsService();
    const service = makeService(commandRepo, queryRepo, sqsService);

    const updatedUser = new User(
      existingUser.id,
      'NewFirstName',
      'NewLastName',
      'America/New_York',
      existingUser.createdAt,
      new Date('2024-01-03'),
    );

    queryRepo.getById.mockResolvedValueOnce(existingUser);
    commandRepo.update.mockResolvedValueOnce(updatedUser);

    const updateDto: UpdateUserDto = {
      firstName: 'NewFirstName',
      lastName: 'NewLastName',
      timeZone: 'America/New_York',
    };

    await service.update(existingUser.id, updateDto);

    expect(sqsService.sendUserEvent).toHaveBeenCalledTimes(1);
  });

  test('should throw NotFoundError when user not found for update', async () => {
    const commandRepo = makeCommandRepo();
    const queryRepo = makeQueryRepo();
    const sqsService = makeSqsService();
    const service = makeService(commandRepo, queryRepo, sqsService);

    queryRepo.getById.mockResolvedValueOnce(undefined);

    const updateDto: UpdateUserDto = {
      firstName: 'NewFirstName',
      lastName: 'NewLastName',
      timeZone: 'America/New_York',
    };

    await expect(service.update(existingUser.id, updateDto)).rejects.toBeInstanceOf(
      NotFoundError,
    );

    expect(commandRepo.update).not.toHaveBeenCalled();
    expect(sqsService.sendUserEvent).not.toHaveBeenCalled();
  });

  test('should propagate repository errors', async () => {
    const commandRepo = makeCommandRepo();
    const queryRepo = makeQueryRepo();
    const sqsService = makeSqsService();
    const service = makeService(commandRepo, queryRepo, sqsService);

    queryRepo.getById.mockResolvedValueOnce(existingUser);
    const err = new Error('db down');
    commandRepo.update.mockRejectedValueOnce(err);

    const updateDto: UpdateUserDto = {
      firstName: 'NewFirstName',
      lastName: 'NewLastName',
      timeZone: 'America/New_York',
    };

    await expect(service.update(existingUser.id, updateDto)).rejects.toThrow('db down');
    expect(commandRepo.update).toHaveBeenCalledWith(existingUser.id, updateDto);
  });
});
