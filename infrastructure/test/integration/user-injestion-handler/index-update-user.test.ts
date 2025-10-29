import { SQSClient } from '@aws-sdk/client-sqs';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { Kysely } from 'kysely';
import { Database } from '../../../lambda/user-ingestion-handler/types';
import {
  LOCALSTACK_CONFIG,
  TEST_TIMEOUTS,
  createTestDatabase,
  cleanDatabase,
  insertUser,
  insertUserBirthday,
  findUserById,
  findUserBirthdayByUserId,
  sendMessageToQueue,
  waitForLambdaProcessing,
  getQueueStatus,
  createUpdateUserMessage,
} from '../../helpers';

describe('UserIngestionQueueConsumer Lambda Integration Updation Test', () => {
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

  test('should process update event message from queue', async () => {
    const userId = '686d14b7-71ab-437a-b3a2-26f1c77992e5';

    await insertUser(db, userId, 'Tony', 'Taylor');

    const updateMessage = createUpdateUserMessage(userId, 'Tony', 'Robins');
    await sendMessageToQueue(sqsClient, updateMessage);
    await waitForLambdaProcessing(sqsClient, TEST_TIMEOUTS.MESSAGE_PROCESSING);

    const queueStatus = await getQueueStatus(sqsClient);

    expect(queueStatus.messagesInQueue).toBe(0);
    expect(queueStatus.messagesInFlight).toBe(0);
  }, TEST_TIMEOUTS.TEST_TIMEOUT);

  test('should update user for updation event message from queue', async () => {
    const userId = '6b3c5afe-a72e-422c-8cfe-3bd7066f6c74';
    const originalLastName = 'Taylor';
    const updatedLastName = 'Marsden';

    await insertUser(db, userId, 'John', originalLastName);

    const updateMessage = createUpdateUserMessage(userId, 'John', updatedLastName);
    await sendMessageToQueue(sqsClient, updateMessage);
    await waitForLambdaProcessing(sqsClient);

    const updatedUser = await findUserById(db, userId);


    expect(updatedUser).toMatchObject({
      id: userId,
      first_name: 'John',
      last_name: updatedLastName,
    });
  }, TEST_TIMEOUTS.TEST_TIMEOUT);

  test('should update user birthday for updation event message from queue', async () => {
    const userId = '01c6dec9-d3f8-4cf0-9bbe-2f41e06ee254';
    const originalTimezone = 'France/Paris';
    const updatedTimezone = 'America/New_York';

    await insertUser(db, userId, 'Tom', 'Hanks');
    await insertUserBirthday(db, userId, 15, 1, 1990, originalTimezone);

    const updateMessage = createUpdateUserMessage(userId, 'Tom', 'Hanks', updatedTimezone);
    await sendMessageToQueue(sqsClient, updateMessage);
    await waitForLambdaProcessing(sqsClient);

    const updatedBirthday = await findUserBirthdayByUserId(db, userId);

    expect(updatedBirthday).toMatchObject({
      user_id: userId,
      day: 15,
      month: 1,
      year: 1990,
      timezone: updatedTimezone,
    });
  }, TEST_TIMEOUTS.TEST_TIMEOUT);
});
