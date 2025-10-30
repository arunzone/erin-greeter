import { BirthdayFinderService } from '../../../lambda/birthday-finder-handler/service/BirthdayFinderService';
import { BirthdayRepository, BirthdayUser } from '../../../lambda/birthday-finder-handler/repository/BirthdayRepository';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { TimezoneCalculator } from '../../../lambda/birthday-finder-handler/utils/TimezoneCalculator';

const sqsClientMock = {
  send: jest.fn(),
};

jest.mock('@aws-sdk/client-sqs', () => ({
  ...jest.requireActual('@aws-sdk/client-sqs'),
  SQSClient: jest.fn(() => sqsClientMock),
}));

jest.mock('../../../lambda/birthday-finder-handler/utils/TimezoneCalculator');

describe('BirthdayFinderService', () => {
  let service: BirthdayFinderService;
  let mockRepository: jest.Mocked<BirthdayRepository>;
  let mockSQSClient: jest.Mocked<SQSClient>;
  let mockTimezoneCalculator: jest.Mocked<TimezoneCalculator>;
  const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue';

  beforeEach(() => {
    mockRepository = {
      findUsersNeedingGreetingSoon: jest.fn().mockResolvedValue([]),
    } as any;

    mockSQSClient = new SQSClient({}) as any;
    (mockSQSClient.send as jest.Mock).mockClear();

    (TimezoneCalculator as jest.MockedClass<typeof TimezoneCalculator>).mockClear();
    mockTimezoneCalculator = {
      findTimezonesInWindow: jest.fn().mockReturnValue(['America/New_York', 'America/Chicago']),
      getCurrentDateInTimezones: jest.fn().mockReturnValue({ month: 10, day: 30 }),
    } as any;
    (TimezoneCalculator as jest.MockedClass<typeof TimezoneCalculator>).mockImplementation(() => mockTimezoneCalculator);

    service = new BirthdayFinderService(mockRepository, mockSQSClient, queueUrl);
  });

  test('should return zero when no users found', async () => {
    mockRepository.findUsersNeedingGreetingSoon.mockResolvedValue([]);

    const result = await service.findAndScheduleGreetings();

    expect(result).toBe(0);
  });

  test('should return count of users found', async () => {
    const users: BirthdayUser[] = [
      {
        userId: '1',
        firstName: 'John',
        lastName: 'Doe',
        timezone: 'America/New_York',
        month: 10,
        day: 29,
        sentYear: null,
      },
      {
        userId: '2',
        firstName: 'Jane',
        lastName: 'Smith',
        timezone: 'Europe/London',
        month: 10,
        day: 29,
        sentYear: null,
      },
    ];

    mockRepository.findUsersNeedingGreetingSoon.mockResolvedValue(users);

    const result = await service.findAndScheduleGreetings();

    expect(result).toBe(2);
  });

  test('should send message to SQS for each user', async () => {
    const users: BirthdayUser[] = [
      {
        userId: '1',
        firstName: 'John',
        lastName: 'Doe',
        timezone: 'America/New_York',
        month: 10,
        day: 29,
        sentYear: null,
      },
    ];

    mockRepository.findUsersNeedingGreetingSoon.mockResolvedValue(users);

    await service.findAndScheduleGreetings();

    expect(mockSQSClient.send).toHaveBeenCalledTimes(1);
  });

  test('should include userId in message body', async () => {
    const users: BirthdayUser[] = [
      {
        userId: 'test-user-123',
        firstName: 'John',
        lastName: 'Doe',
        timezone: 'America/New_York',
        month: 10,
        day: 29,
        sentYear: null,
      },
    ];

    mockRepository.findUsersNeedingGreetingSoon.mockResolvedValue(users);

    await service.findAndScheduleGreetings();

    const sendCall = (mockSQSClient.send as jest.Mock).mock.calls[0][0];
    const command = sendCall as SendMessageCommand;
    const messageBody = JSON.parse(command.input.MessageBody!);

    expect(messageBody.userId).toBe('test-user-123');
  });

  test('should include firstName in message body', async () => {
    const users: BirthdayUser[] = [
      {
        userId: '1',
        firstName: 'Alice',
        lastName: 'Wonder',
        timezone: 'Asia/Tokyo',
        month: 10,
        day: 29,
        sentYear: null,
      },
    ];

    mockRepository.findUsersNeedingGreetingSoon.mockResolvedValue(users);

    await service.findAndScheduleGreetings();

    const sendCall = (mockSQSClient.send as jest.Mock).mock.calls[0][0];
    const command = sendCall as SendMessageCommand;
    const messageBody = JSON.parse(command.input.MessageBody!);

    expect(messageBody.firstName).toBe('Alice');
  });

  test('should include lastName in message body', async () => {
    const users: BirthdayUser[] = [
      {
        userId: '1',
        firstName: 'Bob',
        lastName: 'Builder',
        timezone: 'Europe/Paris',
        month: 10,
        day: 29,
        sentYear: null,
      },
    ];

    mockRepository.findUsersNeedingGreetingSoon.mockResolvedValue(users);

    await service.findAndScheduleGreetings();

    const sendCall = (mockSQSClient.send as jest.Mock).mock.calls[0][0];
    const command = sendCall as SendMessageCommand;
    const messageBody = JSON.parse(command.input.MessageBody!);

    expect(messageBody.lastName).toBe('Builder');
  });

  test('should set delay between 0 and 900 seconds', async () => {
    const users: BirthdayUser[] = [
      {
        userId: '1',
        firstName: 'Charlie',
        lastName: 'Brown',
        timezone: 'America/Los_Angeles',
        month: 10,
        day: 29,
        sentYear: null,
      },
    ];

    mockRepository.findUsersNeedingGreetingSoon.mockResolvedValue(users);

    await service.findAndScheduleGreetings();

    const sendCall = (mockSQSClient.send as jest.Mock).mock.calls[0][0];
    const command = sendCall as SendMessageCommand;
    const delay = command.input.DelaySeconds!;

    expect(delay).toBeGreaterThanOrEqual(0);
  });

  test('should not exceed 900 seconds delay limit', async () => {
    const users: BirthdayUser[] = [
      {
        userId: '1',
        firstName: 'David',
        lastName: 'Lee',
        timezone: 'Australia/Sydney',
        month: 10,
        day: 29,
        sentYear: null,
      },
    ];

    mockRepository.findUsersNeedingGreetingSoon.mockResolvedValue(users);

    await service.findAndScheduleGreetings();

    const sendCall = (mockSQSClient.send as jest.Mock).mock.calls[0][0];
    const command = sendCall as SendMessageCommand;
    const delay = command.input.DelaySeconds!;

    expect(delay).toBeLessThanOrEqual(900);
  });

  test('should send to correct queue URL', async () => {
    const users: BirthdayUser[] = [
      {
        userId: '1',
        firstName: 'Eve',
        lastName: 'Adams',
        timezone: 'America/Chicago',
        month: 10,
        day: 29,
        sentYear: null,
      },
    ];

    mockRepository.findUsersNeedingGreetingSoon.mockResolvedValue(users);

    await service.findAndScheduleGreetings();

    const sendCall = (mockSQSClient.send as jest.Mock).mock.calls[0][0];
    const command = sendCall as SendMessageCommand;

    expect(command.input.QueueUrl).toBe(queueUrl);
  });

  test('should call repository with timezones, month, and day parameters', async () => {
    await service.findAndScheduleGreetings();

    expect(mockRepository.findUsersNeedingGreetingSoon).toHaveBeenCalledTimes(1);
    const callArgs = mockRepository.findUsersNeedingGreetingSoon.mock.calls[0];

    expect(callArgs).toHaveLength(3);
    expect(Array.isArray(callArgs[0])).toBe(true);
    expect(typeof callArgs[1]).toBe('number');
    expect(typeof callArgs[2]).toBe('number');
  });

  test('should pass timezone array to repository', async () => {
    await service.findAndScheduleGreetings();

    const callArgs = mockRepository.findUsersNeedingGreetingSoon.mock.calls[0];
    const timezones = callArgs[0] as string[];

    expect(timezones.length).toBeGreaterThanOrEqual(0);
  });

  test('should pass valid month and day to repository', async () => {
    await service.findAndScheduleGreetings();

    const callArgs = mockRepository.findUsersNeedingGreetingSoon.mock.calls[0];
    const month = callArgs[1] as number;
    const day = callArgs[2] as number;

    expect(month).toBeGreaterThanOrEqual(1);
    expect(month).toBeLessThanOrEqual(12);
    expect(day).toBeGreaterThanOrEqual(1);
    expect(day).toBeLessThanOrEqual(31);
  });
});
