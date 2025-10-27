import { UserService } from '../../../lambda/user-ingestion-handler/service/UserService';
import { UserRepository } from '../../../lambda/user-ingestion-handler/repository/UserRepository';
import { UserMessage } from '../../../lambda/user-ingestion-handler/model';
import { User } from '../../../lambda/user-ingestion-handler/types';

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<UserRepository<User>>;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    first_name: 'John',
    last_name: 'Doe',
    birthday: '1990-01-01',
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
      birthday: '1990-01-01T00:00:00Z',
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

    userService = new UserService(mockUserRepository);

    jest.clearAllMocks();
  });

  describe('processUserMessage', () => {
    it('should create a new user when user does not exist', async () => {
      mockUserRepository.findUserById.mockResolvedValue(undefined);
      mockUserRepository.createUser.mockResolvedValue(mockUser);

      const result = await userService.processUserMessage(mockUserMessage);

      expect(mockUserRepository.createUser).toHaveBeenCalledWith({
        id: '123e4567-e89b-12d3-a456-426614174000',
        first_name: 'John',
        last_name: 'Doe',
        birthday: '1990-01-01',
        timezone: 'America/New_York',
      });
      expect(result).toEqual(mockUser);
    });

    it('should return existing user when user already exists', async () => {
      mockUserRepository.findUserById.mockResolvedValue(mockUser);
      mockUserRepository.createUser.mockResolvedValue(mockUser);

      const result = await userService.processUserMessage(mockUserMessage);

      expect(result).toEqual(mockUser);
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

      expect(mockUserRepository.createUser).toHaveBeenCalledWith({
        id: '123e4567-e89b-12d3-a456-426614174000',
        first_name: 'John',
        last_name: 'Doe',
        birthday: undefined,
        timezone: 'America/New_York',
      });
      expect(result).toEqual(mockUser);
    });

    it('should format birthday correctly using moment', async () => {
      mockUserRepository.findUserById.mockResolvedValue(undefined);
      mockUserRepository.createUser.mockResolvedValue(mockUser);

      await userService.processUserMessage(mockUserMessage);

      expect(mockUserRepository.createUser).toHaveBeenCalledWith({
        id: '123e4567-e89b-12d3-a456-426614174000',
        first_name: 'John',
        last_name: 'Doe',
        birthday: '1990-01-01',
        timezone: 'America/New_York',
      });
    });

    it('should handle repository errors gracefully', async () => {
      const repositoryError = new Error('Database connection failed');
      mockUserRepository.findUserById.mockRejectedValue(repositoryError);

      await expect(userService.processUserMessage(mockUserMessage)).rejects.toThrow('Database connection failed');
    });

    it('should handle create user errors gracefully', async () => {
      mockUserRepository.findUserById.mockResolvedValue(undefined);
      const createError = new Error('Failed to insert user');
      mockUserRepository.createUser.mockRejectedValue(createError);

      await expect(userService.processUserMessage(mockUserMessage)).rejects.toThrow('Failed to insert user');
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
