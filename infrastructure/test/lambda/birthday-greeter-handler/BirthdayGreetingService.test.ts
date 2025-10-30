import { BirthdayGreetingService } from '../../../lambda/birthday-greeter-handler/service/BirthdayGreetingService';
import { BirthdayGreetingRepository } from '../../../lambda/birthday-greeter-handler/repository/BirthdayGreetingRepository';
import { GreetingClient } from '../../../lambda/birthday-greeter-handler/client/GreetingClient';
import { GreetingMessage } from '../../../lambda/birthday-greeter-handler/model';

describe('BirthdayGreetingService', () => {
  let service: BirthdayGreetingService;
  let mockBirthdayGreetingRepository: jest.Mocked<BirthdayGreetingRepository>;
  let mockGreetingClient: jest.Mocked<GreetingClient>;

  beforeEach(() => {
    mockBirthdayGreetingRepository = {
      updateSentYear: jest.fn(),
    };
    mockGreetingClient = {
      sendGreeting: jest.fn(),
    };

    service = new BirthdayGreetingService(
      mockBirthdayGreetingRepository,
      mockGreetingClient
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should send a greeting if the year was updated', async () => {
    mockBirthdayGreetingRepository.updateSentYear.mockResolvedValue(true);

    const message: GreetingMessage = {
      userId: 'test-user-id',
      firstName: 'John',
      lastName: 'Doe',
      year: 2023,
    };

    await service.processGreeting(message);

    expect(mockBirthdayGreetingRepository.updateSentYear).toHaveBeenCalledWith(
      message.userId,
      message.year
    );
    expect(mockGreetingClient.sendGreeting).toHaveBeenCalledTimes(1);
    expect(mockGreetingClient.sendGreeting).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Hey, John Doe it's your birthday!",
        userId: 'test-user-id',
      })
    );
  });

  test('should not send a greeting if the year was not updated', async () => {
    mockBirthdayGreetingRepository.updateSentYear.mockResolvedValue(false);

    const message: GreetingMessage = {
      userId: 'test-user-id',
      firstName: 'Jane',
      lastName: 'Smith',
      year: 2023,
    };

    await service.processGreeting(message);

    expect(mockBirthdayGreetingRepository.updateSentYear).toHaveBeenCalledWith(
      message.userId,
      message.year
    );
    expect(mockGreetingClient.sendGreeting).not.toHaveBeenCalled();
  });
});
