import { SQSClient, SendMessageCommand, GetQueueAttributesCommand } from '@aws-sdk/client-sqs';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool, types } from 'pg';
import { Database } from '../../../lambda/user-ingestion-handler/types';

const LOCALSTACK_CONFIG = {
  endpoint: 'http://localhost:4566',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
};

const TEST_TIMEOUTS = {
  MESSAGE_PROCESSING: 8000,
  LAMBDA_PROCESSING: 10000,
  TEST_TIMEOUT: 30000,
};

const QUEUE_URL = 'http://sqs.us-east-1.localhost:4566/000000000000/ingestion-queue';

const DATABASE_CONFIG = {
  host: 'localhost',
  port: 5433,
  user: 'test',
  password: 'test',
  database: 'postgres',
  max: 2,
  min: 0,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
};

types.setTypeParser(1082, stringValue => stringValue);

describe('UserIngestionQueueConsumer Lambda Integration Deletion Test', () => {
  let sqsClient: SQSClient;
  let lambdaClient: LambdaClient;
  let db: Kysely<Database>;

  const createDeleteUserMessage = (userId: string, firstName: string, lastName: string, timeZone = 'America/New_York', birthday = '1990-01-15T00:00:00.000Z') => ({
    eventType: 'deleted',
    user: {
      id: userId,
      firstName,
      lastName,
      timeZone,
      birthday,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  });

  const insertUser = async (userId: string, firstName: string, lastName: string) => {
    return await db
      .insertInto('user')
      .values({
        id: userId,
        first_name: firstName,
        last_name: lastName,
      })
      .returning('id')
      .executeTakeFirst();
  };

  const insertUserBirthday = async (userId: string, day: number, month: number, year: number, timezone: string) => {
    return await db
      .insertInto('user_birthday')
      .values({
        user_id: userId,
        day,
        month,
        year,
        timezone,
      })
      .returning('id')
      .executeTakeFirst();
  };

  const sendMessageToQueue = async (message: unknown) => {
    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: QUEUE_URL,
        MessageBody: JSON.stringify(message),
      })
    );
  };

  const waitForLambdaProcessing = async (timeout = TEST_TIMEOUTS.LAMBDA_PROCESSING) => {
    await new Promise(resolve => setTimeout(resolve, timeout));
  };

  const getQueueStatus = async () => {
    const queueAttributes = await sqsClient.send(
      new GetQueueAttributesCommand({
        QueueUrl: QUEUE_URL,
        AttributeNames: ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible'],
      })
    );

    return {
      messagesInQueue: parseInt(queueAttributes.Attributes?.ApproximateNumberOfMessages || '0'),
      messagesInFlight: parseInt(queueAttributes.Attributes?.ApproximateNumberOfMessagesNotVisible || '0'),
    };
  };

  const findUserById = async (userId: string) => {
    return await db.selectFrom('user').where('id', '=', userId).selectAll().executeTakeFirst();
  };

  const findUserBirthdayByUserId = async (userId: string) => {
    return await db.selectFrom('user_birthday').where('user_id', '=', userId).selectAll().executeTakeFirst();
  };

  beforeAll(async () => {
    sqsClient = new SQSClient(LOCALSTACK_CONFIG);
    lambdaClient = new LambdaClient(LOCALSTACK_CONFIG);

    const pool = new Pool(DATABASE_CONFIG);
    pool.on('error', err => {
      console.error('Unexpected error on idle client', err);
    });

    db = new Kysely<Database>({
      dialect: new PostgresDialect({ pool }),
    });

    await db.deleteFrom('user_birthday').execute();
    await db.deleteFrom('user').execute();
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

    await insertUser(userId, 'John', 'Doe');
    await insertUserBirthday(userId, 15, 1, 1990, 'America/New_York');

    const deleteMessage = createDeleteUserMessage(userId, 'John', 'Doe');
    await sendMessageToQueue(deleteMessage);
    await waitForLambdaProcessing(TEST_TIMEOUTS.MESSAGE_PROCESSING);

    const queueStatus = await getQueueStatus();

    expect(queueStatus.messagesInQueue).toBe(0);
    expect(queueStatus.messagesInFlight).toBe(0);
  }, TEST_TIMEOUTS.TEST_TIMEOUT);

  test('should delete user for deletion event message from queue', async () => {
    const userId = 'c48cbe05-7472-4821-a599-f68aa4cbca6f';

    await insertUser(userId, 'John', 'Doe');
    await insertUserBirthday(userId, 15, 1, 1990, 'America/New_York');

    const deleteMessage = createDeleteUserMessage(userId, 'John', 'Doe');
    await sendMessageToQueue(deleteMessage);
    await waitForLambdaProcessing();

    const deletedUser = await findUserById(userId);
    const deletedBirthday = await findUserBirthdayByUserId(userId);

    expect(deletedUser).toBeUndefined();
    expect(deletedBirthday).toBeUndefined();
  }, TEST_TIMEOUTS.TEST_TIMEOUT);
});
