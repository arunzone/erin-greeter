import { SQSClient } from '@aws-sdk/client-sqs';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { Kysely } from 'kysely';
import { Database } from '../../../lambda/user-ingestion-handler/types';
import {
  LOCALSTACK_CONFIG,
  TEST_TIMEOUTS,
  LAMBDA_CONFIG,
  createTestDatabase,
  cleanDatabase,
  findUserById,
  sendMessageToQueue,
  sendBatchMessagesToQueue,
  waitForLambdaProcessing,
  getQueueStatus,
  getLambdaFunctionConfig,
  createUserMessage,
  createBatchUserMessages,
} from '../../helpers';

describe('UserIngestionQueueConsumer Lambda Integration Test', () => {
  let sqsClient: SQSClient;
  let lambdaClient: LambdaClient;
  let db: Kysely<Database>;

  beforeAll(async () => {
    sqsClient = new SQSClient(LOCALSTACK_CONFIG);
    lambdaClient = new LambdaClient(LOCALSTACK_CONFIG);
    db = await createTestDatabase();
    await cleanDatabase(db);
  });

  afterAll(async () => {
    try {
      // Only destroy Kysely - it will handle closing the pool
      if (db) {
        await db.destroy();
      }
    } catch (error) {
      console.error('Error during test teardown:', error);
    } finally {
      try {
        if (sqsClient) sqsClient.destroy();
        if (lambdaClient) lambdaClient.destroy();
      } catch (error) {
        console.error('Error cleaning up AWS clients:', error);
      }
    }
  });

  test('should process user ingestion message from queue', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    const createMessage = createUserMessage(userId, 'John', 'Doe');
    await sendMessageToQueue(sqsClient, createMessage);
    await waitForLambdaProcessing(sqsClient, TEST_TIMEOUTS.MESSAGE_PROCESSING);

    const queueStatus = await getQueueStatus(sqsClient);

    expect(queueStatus.messagesInQueue).toBe(0);
    expect(queueStatus.messagesInFlight).toBe(0);
  }, TEST_TIMEOUTS.TEST_TIMEOUT);

  test('should process user message from queue and persist user in database', async () => {
    const userId = 'c48cbe05-7472-4821-a599-f68aa4cbca6f';
    const firstName = 'John';
    const lastName = 'Doe';

    const createMessage = createUserMessage(userId, firstName, lastName);
    await sendMessageToQueue(sqsClient, createMessage);
    await waitForLambdaProcessing(sqsClient);

    const createdUser = await findUserById(db, userId);

    expect(createdUser).toMatchObject({
      id: userId,
      first_name: firstName,
      last_name: lastName,
    });
  }, TEST_TIMEOUTS.TEST_TIMEOUT);

  test('should verify lambda function exists and is configured', async () => {
    const functionConfig = await getLambdaFunctionConfig(lambdaClient);

    expect(functionConfig.Configuration?.FunctionName).toBe(LAMBDA_CONFIG.functionName);
    expect(functionConfig.Configuration?.Runtime).toBe(LAMBDA_CONFIG.runtime);
    expect(functionConfig.Configuration?.Timeout).toBe(LAMBDA_CONFIG.timeout);
  });

  test('should process batch of user messages', async () => {
    const testUsers = [
      { id: '17d86534-a5c1-48d9-b27f-7064701225b5', firstName: 'Alice', lastName: 'Smith', timeZone: 'UTC', birthday: '1985-03-20T00:00:00.000Z' },
      { id: 'c0d2bf45-6e87-42fa-960a-da323dfb1123', firstName: 'Bob', lastName: 'Johnson', timeZone: 'America/Los_Angeles', birthday: '1992-07-15T00:00:00.000Z' },
      { id: 'e1ae4c30-14ef-4b2b-825f-b01fe439f423', firstName: 'Charlie', lastName: 'Williams', timeZone: 'Europe/London', birthday: '1988-11-30T00:00:00.000Z' },
    ];

    const createMessages = createBatchUserMessages(testUsers);

    await sendBatchMessagesToQueue(sqsClient, createMessages);
    await waitForLambdaProcessing(sqsClient, TEST_TIMEOUTS.BATCH_PROCESSING);

    const queueStatus = await getQueueStatus(sqsClient);

    expect(queueStatus.messagesInQueue).toBe(0);
    expect(queueStatus.messagesInFlight).toBe(0);
  }, TEST_TIMEOUTS.BATCH_TEST_TIMEOUT);
});
