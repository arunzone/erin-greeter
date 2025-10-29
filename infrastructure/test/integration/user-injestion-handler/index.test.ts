import { SQSClient, SendMessageCommand, GetQueueAttributesCommand } from '@aws-sdk/client-sqs';
import { LambdaClient, GetFunctionCommand } from '@aws-sdk/client-lambda';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool, types } from 'pg';
import { Database } from '../../../lambda/user-ingestion-handler/types';

const localstackConfig = {
  endpoint: 'http://localhost:4566',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
};
types.setTypeParser(1082, stringValue => {
  return stringValue; // Return the string '1990-01-15' directly
});

describe('UserIngestionQueueConsumer Lambda Integration Test', () => {
  let sqsClient: SQSClient;
  let lambdaClient: LambdaClient;
  let queueUrl: string;
  let db: Kysely<Database>;

  beforeAll(async () => {
    sqsClient = new SQSClient({
      region: localstackConfig.region,
      endpoint: localstackConfig.endpoint,
      credentials: localstackConfig.credentials,
    });

    lambdaClient = new LambdaClient({
      region: localstackConfig.region,
      endpoint: localstackConfig.endpoint,
      credentials: localstackConfig.credentials,
    });

    queueUrl = 'http://sqs.us-east-1.localhost:4566/000000000000/ingestion-queue';

    // Setup database connection for testing - Kysely owns the pool
    const pool = new Pool({
      host: 'localhost',
      port: 5433,
      user: 'test',
      password: 'test',
      database: 'postgres',
      max: 2,
      min: 0,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    });

    // Handle pool errors
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
    const testUser = {
      eventType: 'created',
      user: {
        id: userId,
        firstName: 'John',
        lastName: 'Doe',
        timeZone: 'America/New_York',
        birthday: '1990-01-15T00:00:00.000Z',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(testUser),
      })
    );

    await new Promise(resolve => setTimeout(resolve, 8000));

    const queueAttributes = await sqsClient.send(
      new GetQueueAttributesCommand({
        QueueUrl: queueUrl,
        AttributeNames: ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible'],
      })
    );

    const messagesInQueue = parseInt(
      queueAttributes.Attributes?.ApproximateNumberOfMessages || '0'
    );
    const messagesInFlight = parseInt(
      queueAttributes.Attributes?.ApproximateNumberOfMessagesNotVisible || '0'
    );

    expect(messagesInQueue).toBe(0);
    expect(messagesInFlight).toBe(0);
  }, 30000);

  test('should process user message from queue and persist user in database', async () => {
    const userId = 'c48cbe05-7472-4821-a599-f68aa4cbca6f';
    const testUser = {
      eventType: 'created',
      user: {
        id: userId,
        firstName: 'John',
        lastName: 'Doe',
        timeZone: 'America/New_York',
        birthday: '1990-01-15T00:00:00.000Z',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(testUser),
      })
    );

    await new Promise(resolve => setTimeout(resolve, 10000));

    const userInDb = await db
      .selectFrom('user')
      .where('id', '=', userId)
      .selectAll()
      .executeTakeFirst();

    expect(userInDb!.id).toBe(userId);
    expect(userInDb!.first_name).toBe(testUser.user.firstName);
    expect(userInDb!.last_name).toBe(testUser.user.lastName);
    expect(userInDb!.created_at).toBeDefined();
  }, 30000);

  test('should verify lambda function exists and is configured', async () => {
    const getFunctionCommand = new GetFunctionCommand({
      FunctionName: 'UserIngestionHandler',
    });

    const functionData = await lambdaClient.send(getFunctionCommand);

    expect(functionData.Configuration?.FunctionName).toBe('UserIngestionHandler');
    expect(functionData.Configuration?.Runtime).toBe('nodejs22.x');
    expect(functionData.Configuration?.Timeout).toBe(30);
  });

  test('should process batch of user messages', async () => {
    const users = [
      {
        eventType: 'created',
        user: {
          id: '17D86534-A5C1-48D9-B27F-7064701225B5',
          firstName: 'Alice',
          lastName: 'Smith',
          birthday: '1985-03-20T00:00:00.000Z',
          timeZone: 'UTC',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      },
      {
        eventType: 'created',
        user: {
          id: 'C0D2BF45-6E87-42FA-960A-DA323DFB1123',
          firstName: 'Bob',
          lastName: 'Johnson',
          birthday: '1992-07-15T00:00:00.000Z',
          timeZone: 'America/Los_Angeles',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      },
      {
        eventType: 'created',
        user: {
          id: 'E1AE4C30-14EF-4B2B-825F-B01FE439F423',
          firstName: 'Charlie',
          lastName: 'Williams',
          birthday: '1988-11-30T00:00:00.000Z',
          timeZone: 'Europe/London',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      },
    ];

    console.log(`Sending ${users.length} messages...`);

    // Send all messages
    for (const user of users) {
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify(user),
        })
      );
    }

    // Wait for processing
    console.log('Waiting for batch processing...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Check queue is empty
    const queueAttributes = await sqsClient.send(
      new GetQueueAttributesCommand({
        QueueUrl: queueUrl,
        AttributeNames: ['ApproximateNumberOfMessages'],
      })
    );

    const messagesInQueue = parseInt(
      queueAttributes.Attributes?.ApproximateNumberOfMessages || '0'
    );
    const messagesInFlight = parseInt(
      queueAttributes.Attributes?.ApproximateNumberOfMessagesNotVisible || '0'
    );

    expect(messagesInQueue).toBe(0);
    expect(messagesInFlight).toBe(0);
  }, 40000);
});
