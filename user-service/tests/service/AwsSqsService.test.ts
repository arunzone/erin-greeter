import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

import { AppConfig } from 'config/config';
import { User } from 'domain/User';
import { UserEventType } from 'domain/UserEventType';
import { AwsSqsService } from 'service/AwsSqsService';

describe('AwsSqsService', () => {
  let mockSqsClient: SQSClient;
  let mockConfig: AppConfig;
  let service: AwsSqsService;

  const MOCK_QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue';
  const MOCK_MESSAGE_ID = 'mock-message-id-123';

  const createMockUser = (): User =>
    ({
      id: 'user-123',
      firstName: 'John',
      lastName: 'Doe',
      timeZone: 'America/New_York',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-15T00:00:00.000Z'),
      birthday: new Date('1990-05-15T00:00:00.000Z'),
    }) as User;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSqsClient = new SQSClient({}) as jest.Mocked<SQSClient>;
    mockSqsClient.send = jest.fn();

    mockConfig = {
      aws: {
        sqsQueueUrl: MOCK_QUEUE_URL,
      },
    } as AppConfig;

    service = new AwsSqsService(mockSqsClient, mockConfig);
  });

  describe('sendUserEvent', () => {
    test('should send an expected user details as message to SQS', async () => {
      const user = createMockUser();
      const eventType = UserEventType.CREATED;
      (mockSqsClient.send as jest.Mock).mockResolvedValueOnce({ MessageId: MOCK_MESSAGE_ID });

      await service.sendUserEvent(user, eventType);

      expect(mockSqsClient.send).toHaveBeenCalledWith(expect.any(SendMessageCommand));
    });
    test('should send message once to SQS', async () => {
      const user = createMockUser();
      const eventType = UserEventType.CREATED;
      (mockSqsClient.send as jest.Mock).mockResolvedValueOnce({ MessageId: MOCK_MESSAGE_ID });

      await service.sendUserEvent(user, eventType);

      expect(mockSqsClient.send).toHaveBeenCalledTimes(1);
    });
    test('should send message with correct payload structure', async () => {
      const user = createMockUser();
      const eventType = UserEventType.CREATED;
      (mockSqsClient.send as jest.Mock).mockResolvedValueOnce({ MessageId: MOCK_MESSAGE_ID });

      await service.sendUserEvent(user, eventType);

      const sendCall = (mockSqsClient.send as jest.Mock).mock.calls[0][0] as SendMessageCommand;
      const messageBody = JSON.parse(sendCall.input.MessageBody!);

      expect(messageBody).toEqual({
        eventType: UserEventType.CREATED,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          timeZone: user.timeZone,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
          birthday: user.birthday ? user.birthday.toISOString() : null,
        },
        timestamp: expect.any(String),
      });
    });
  });
  test('should send message to the correct queue URL', async () => {
    const user = createMockUser();
    const eventType = UserEventType.CREATED;
    (mockSqsClient.send as jest.Mock).mockResolvedValueOnce({ MessageId: MOCK_MESSAGE_ID });

    await service.sendUserEvent(user, eventType);

    const sendCall = (mockSqsClient.send as jest.Mock).mock.calls[0][0] as SendMessageCommand;
    expect(sendCall.input.QueueUrl).toBe(MOCK_QUEUE_URL);
  });
  test('should skip sending message when queue URL is not configured', async () => {
    mockConfig.aws.sqsQueueUrl = '';
    const user = createMockUser();
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    await service.sendUserEvent(user, UserEventType.CREATED);

    expect(mockSqsClient.send).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'SQS_QUEUE_URL not configured, skipping SQS message',
    );

    consoleWarnSpy.mockRestore();
  });
  test('should throw error when SQS send fails', async () => {
    const user = createMockUser();
    const eventType = UserEventType.CREATED;
    const sqsError = new Error('Network timeout');
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    (mockSqsClient.send as jest.Mock).mockRejectedValueOnce(sqsError);

    await expect(service.sendUserEvent(user, eventType)).rejects.toThrow(
      'Failed to send SQS message: Network timeout',
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      `Failed to send user ${eventType} event to SQS:`,
      sqsError,
    );

    consoleErrorSpy.mockRestore();
  });
  test('should handle non-Error thrown values gracefully', async () => {
    const user = createMockUser();
    const eventType = UserEventType.CREATED;
    const nonErrorValue = 'Unexpected string error';
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    (mockSqsClient.send as jest.Mock).mockRejectedValueOnce(nonErrorValue);

    await expect(service.sendUserEvent(user, eventType)).rejects.toThrow(
        'Failed to send SQS message: Unknown error'
    );
    
    expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Failed to send user ${eventType} event to SQS:`,
        nonErrorValue
    );

    consoleErrorSpy.mockRestore();
    });
});
