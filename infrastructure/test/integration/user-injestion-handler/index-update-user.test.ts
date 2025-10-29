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

describe('UserIngestionQueueConsumer Lambda Integration Updation Test', () => {
  let sqsClient: SQSClient;
  let lambdaClient: LambdaClient;
  let db: Kysely<Database>;

  const createUserMessage = (userId: string, firstName: string, lastName: string, timeZone = 'America/New_York', birthday = '1990-01-15T00:00:00.000Z') => ({
    eventType: 'updated',
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
      .execute();
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

  test('should process update event message from queue', async () => {
    const userId = '686d14b7-71ab-437a-b3a2-26f1c77992e5';

    await insertUser(userId, 'Tony', 'Taylor');

    const updateMessage = createUserMessage(userId, 'Tony', 'Robins');
    await sendMessageToQueue(updateMessage);
    await waitForLambdaProcessing(TEST_TIMEOUTS.MESSAGE_PROCESSING);

    const queueStatus = await getQueueStatus();

    expect(queueStatus.messagesInQueue).toBe(0);
    expect(queueStatus.messagesInFlight).toBe(0);
  }, TEST_TIMEOUTS.TEST_TIMEOUT);

  test('should update user for updation event message from queue', async () => {
    const userId = '6b3c5afe-a72e-422c-8cfe-3bd7066f6c74';
    const originalLastName = 'Taylor';
    const updatedLastName = 'Marsden';

    await insertUser(userId, 'John', originalLastName);

    const updateMessage = createUserMessage(userId, 'John', updatedLastName);
    await sendMessageToQueue(updateMessage);
    await waitForLambdaProcessing();

    const updatedUser = await findUserById(userId);

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

    await insertUser(userId, 'Tom', 'Hanks');
    await insertUserBirthday(userId, 15, 1, 1990, originalTimezone);

    const updateMessage = createUserMessage(userId, 'Tom', 'Hanks', updatedTimezone);
    await sendMessageToQueue(updateMessage);
    await waitForLambdaProcessing();

    const updatedBirthday = await findUserBirthdayByUserId(userId);

    expect(updatedBirthday).toMatchObject({
      user_id: userId,
      day: 15,
      month: 1,
      year: 1990,
      timezone: updatedTimezone,
    });
  }, TEST_TIMEOUTS.TEST_TIMEOUT);
});
