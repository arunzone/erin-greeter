import { SQSClient, SendMessageCommand, GetQueueAttributesCommand } from '@aws-sdk/client-sqs';
import { LambdaClient, GetFunctionCommand } from '@aws-sdk/client-lambda';
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
  BATCH_PROCESSING: 10000,
  TEST_TIMEOUT: 30000,
  BATCH_TEST_TIMEOUT: 40000,
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

const LAMBDA_CONFIG = {
  functionName: 'UserIngestionHandler',
  runtime: 'nodejs22.x',
  timeout: 30,
};

types.setTypeParser(1082, stringValue => stringValue);

describe('UserIngestionQueueConsumer Lambda Integration Test', () => {
  let sqsClient: SQSClient;
  let lambdaClient: LambdaClient;
  let db: Kysely<Database>;

  const createUserMessage = (userId: string, firstName: string, lastName: string, timeZone = 'America/New_York', birthday = '1990-01-15T00:00:00.000Z') => ({
    eventType: 'created',
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

  const sendMessageToQueue = async (message: unknown) => {
    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: QUEUE_URL,
        MessageBody: JSON.stringify(message),
      })
    );
  };

  const sendBatchMessagesToQueue = async (messages: unknown[]) => {
    for (const message of messages) {
      await sendMessageToQueue(message);
    }
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

  const getLambdaFunctionConfig = async () => {
    return await lambdaClient.send(
      new GetFunctionCommand({
        FunctionName: LAMBDA_CONFIG.functionName,
      })
    );
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

  test('should process user ingestion message from queue', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    const createMessage = createUserMessage(userId, 'John', 'Doe');
    await sendMessageToQueue(createMessage);
    await waitForLambdaProcessing(TEST_TIMEOUTS.MESSAGE_PROCESSING);

    const queueStatus = await getQueueStatus();

    expect(queueStatus.messagesInQueue).toBe(0);
    expect(queueStatus.messagesInFlight).toBe(0);
  }, TEST_TIMEOUTS.TEST_TIMEOUT);

  test('should process user message from queue and persist user in database', async () => {
    const userId = 'c48cbe05-7472-4821-a599-f68aa4cbca6f';
    const firstName = 'John';
    const lastName = 'Doe';

    const createMessage = createUserMessage(userId, firstName, lastName);
    await sendMessageToQueue(createMessage);
    await waitForLambdaProcessing();

    const createdUser = await findUserById(userId);

    expect(createdUser).toMatchObject({
      id: userId,
      first_name: firstName,
      last_name: lastName,
    });
  }, TEST_TIMEOUTS.TEST_TIMEOUT);

  test('should verify lambda function exists and is configured', async () => {
    const functionConfig = await getLambdaFunctionConfig();

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

    const createMessages = testUsers.map(user =>
      createUserMessage(user.id, user.firstName, user.lastName, user.timeZone, user.birthday)
    );

    await sendBatchMessagesToQueue(createMessages);
    await waitForLambdaProcessing(TEST_TIMEOUTS.BATCH_PROCESSING);

    const queueStatus = await getQueueStatus();

    expect(queueStatus.messagesInQueue).toBe(0);
    expect(queueStatus.messagesInFlight).toBe(0);
  }, TEST_TIMEOUTS.BATCH_TEST_TIMEOUT);
});
