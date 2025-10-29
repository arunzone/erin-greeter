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
  createDeleteUserMessage,
} from '../../helpers';

describe('UserIngestionQueueConsumer Lambda Integration Deletion Test', () => {
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

  test('should process deletion event message from queue', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    await insertUser(db, userId, 'John', 'Doe');
    await insertUserBirthday(db, userId, 15, 1, 1990, 'America/New_York');

    const deleteMessage = createDeleteUserMessage(userId, 'John', 'Doe');
    await sendMessageToQueue(sqsClient, deleteMessage);
    await waitForLambdaProcessing(sqsClient, TEST_TIMEOUTS.MESSAGE_PROCESSING);

    const queueStatus = await getQueueStatus(sqsClient);

    expect(queueStatus.messagesInQueue).toBe(0);
    expect(queueStatus.messagesInFlight).toBe(0);
  }, TEST_TIMEOUTS.TEST_TIMEOUT);

  test('should delete user for deletion event message from queue', async () => {
    const userId = 'c48cbe05-7472-4821-a599-f68aa4cbca6f';

    await insertUser(db, userId, 'John', 'Doe');
    await insertUserBirthday(db, userId, 15, 1, 1990, 'America/New_York');

    const deleteMessage = createDeleteUserMessage(userId, 'John', 'Doe');
    await sendMessageToQueue(sqsClient, deleteMessage);
    await waitForLambdaProcessing(sqsClient, TEST_TIMEOUTS.MESSAGE_PROCESSING);

    const deletedUser = await findUserById(db, userId);
    const deletedBirthday = await findUserBirthdayByUserId(db, userId);

    expect(deletedUser).toBeUndefined();
    expect(deletedBirthday).toBeUndefined();
  }, TEST_TIMEOUTS.TEST_TIMEOUT);
});
