import { UserService } from '../../../lambda/user-ingestion-handler/service/UserService';
import { UserRepository } from '../../../lambda/user-ingestion-handler/repository/UserRepository';
import { UserMessage } from '../../../lambda/user-ingestion-handler/model';
import {
  User,
  NewUser,
  BirthdayRecord,
  NewUserBirthday,
  UserBirthday,
} from '../../../lambda/user-ingestion-handler/types';
import { UserBirthdayRepository } from '../../../lambda/user-ingestion-handler/repository/UserBirthdayRepository';
import { TransactionManager } from '../../../lambda/user-ingestion-handler/persistence/TransactionManager';

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<UserRepository<User, NewUser>>;
  let mockUserBirthdayRepository: jest.Mocked<
    UserBirthdayRepository<UserBirthday, NewUserBirthday, BirthdayRecord>
  >;
  let mockTransactionManager: jest.Mocked<TransactionManager>;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    first_name: 'John',
    last_name: 'Doe',
    created_at: new Date('2023-01-01T00:00:00Z'),
  };
  const mockUserBirthday: UserBirthday = {
    id: '5B840B73-F0B3-44BA-B7FD-6598C656E8E8',
    user_id: '123e4567-e89b-12d3-a456-426614174000',
    day: 1,
    month: 2,
    year: 1990,
    timezone: 'America/New_York',
    created_at: new Date('2023-01-01T00:00:00Z'),
  };

  const mockUserMessage: UserMessage = {
    eventType: 'created',
    user: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      firstName: 'John',
      lastName: 'Doe',
      timeZone: 'America/New_York',
      birthday: '1990-02-01T00:00:00Z',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    },
    timestamp: '2023-01-01T00:00:00Z',
  };

  beforeEach(() => {
    mockUserRepository = {
      findAllUsers: jest.fn(),
      findUserById: jest.fn(),
      createUser: jest.fn(),
    };
    mockUserBirthdayRepository = {
      findAllBirthdays: jest.fn(),
      createUserBirthday: jest.fn(),
      findUserBirthdayByDayMonthTimezone: jest.fn(),
    };
    mockTransactionManager = {
      runInTransaction: jest.fn().mockImplementation(async callback => {
        const mockTrx = {};
        return callback(mockTrx);
      }),
      db: {},
    } as unknown as jest.Mocked<TransactionManager>;

    userService = new UserService(
      mockUserRepository,
      mockUserBirthdayRepository,
      mockTransactionManager
    );

    jest.clearAllMocks();
  });

  describe('processUserMessage', () => {
    it('should create a new user when user does not exist', async () => {
      mockUserRepository.findUserById.mockResolvedValue(undefined);
      mockUserRepository.createUser.mockResolvedValue(mockUser);

      const result = await userService.processUserMessage(mockUserMessage);

      expect(result?.user).toEqual(mockUser);
    });

    it('should return existing user when user already exists', async () => {
      mockUserRepository.findUserById.mockResolvedValue(mockUser);
      mockUserRepository.createUser.mockResolvedValue(mockUser);

      const result = await userService.processUserMessage(mockUserMessage);

      expect(result?.user).toEqual(mockUser);
    });

    it('should not attempt to persist user when user already exists', async () => {
      mockUserRepository.findUserById.mockResolvedValue(mockUser);
      mockUserRepository.createUser.mockResolvedValue(mockUser);

      await userService.processUserMessage(mockUserMessage);

      expect(mockUserRepository.createUser).not.toHaveBeenCalled();
    });

    it('should handle user without birthday', async () => {
      const messageWithoutBirthday: UserMessage = {
        ...mockUserMessage,
        user: {
          ...mockUserMessage.user,
          birthday: undefined,
        },
      };

      mockUserRepository.findUserById.mockResolvedValue(undefined);
      mockUserRepository.createUser.mockResolvedValue(mockUser);

      const result = await userService.processUserMessage(messageWithoutBirthday);

      expect(result?.user).toEqual(mockUser);
    });

    it('should persist birthday correctly', async () => {
      mockUserRepository.findUserById.mockResolvedValue(undefined);
      mockUserRepository.createUser.mockResolvedValue(mockUser);
      mockUserBirthdayRepository.createUserBirthday.mockResolvedValue(mockUserBirthday);

      const result = await userService.processUserMessage(mockUserMessage);

      expect(result?.userBirthday).toEqual(mockUserBirthday);
    });
    it('should call create birthday correctly', async () => {
      mockUserRepository.findUserById.mockResolvedValue(undefined);
      mockUserRepository.createUser.mockResolvedValue(mockUser);
      mockUserBirthdayRepository.createUserBirthday.mockResolvedValue(mockUserBirthday);

      await userService.processUserMessage(mockUserMessage);

      expect(mockUserBirthdayRepository.createUserBirthday).toHaveBeenCalledWith(
        {
          user_id: '123e4567-e89b-12d3-a456-426614174000',
          day: 1,
          month: 2,
          year: 1990,
          timezone: 'America/New_York',
        },
        {}
      );
    });

    it('should handle repository errors gracefully', async () => {
      const repositoryError = new Error('Database connection failed');
      mockUserRepository.findUserById.mockRejectedValue(repositoryError);

      await expect(userService.processUserMessage(mockUserMessage)).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle create user errors gracefully', async () => {
      mockUserRepository.findUserById.mockResolvedValue(undefined);
      const createError = new Error('Failed to insert user');
      mockUserRepository.createUser.mockRejectedValue(createError);

      await expect(userService.processUserMessage(mockUserMessage)).rejects.toThrow(
        'Failed to insert user'
      );
    });
  });

  describe('printAllUsers', () => {
    it('should return all users from repository', async () => {
      const mockUsers: User[] = [mockUser];
      mockUserRepository.findAllUsers.mockResolvedValue(mockUsers);

      const result = await userService.printAllUsers();
      expect(mockUserRepository.findAllUsers).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockUsers);
    });

    it('should handle empty user list', async () => {
      mockUserRepository.findAllUsers.mockResolvedValue([]);

      const result = await userService.printAllUsers();
      expect(result).toEqual([]);
      expect(mockUserRepository.findAllUsers).toHaveBeenCalledTimes(1);
    });

    it('should handle repository errors in printAllUsers', async () => {
      const error = new Error('Failed to fetch users');
      mockUserRepository.findAllUsers.mockRejectedValue(error);

      await expect(userService.printAllUsers()).rejects.toThrow('Failed to fetch users');
    });
  });
});
