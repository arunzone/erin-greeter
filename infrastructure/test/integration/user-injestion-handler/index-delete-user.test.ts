import { SQSClient, SendMessageCommand, GetQueueAttributesCommand } from '@aws-sdk/client-sqs';
import { LambdaClient } from '@aws-sdk/client-lambda';
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

describe('UserIngestionQueueConsumer Lambda Integration Deletion Test', () => {
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

    // Setup database connection for testing
    db = new Kysely<Database>({
      dialect: new PostgresDialect({
        pool: new Pool({
          host: 'localhost',
          port: 5433,
          user: 'test',
          password: 'test',
          database: 'postgres',
          max: 2,
          min: 0,
          idleTimeoutMillis: 10000,
          connectionTimeoutMillis: 5000,
        }),
      }),
    });
    await db.deleteFrom('user').execute();
    await db.deleteFrom('user_birthday').execute();
  });

  afterAll(async () => {
    sqsClient.destroy();
    lambdaClient.destroy();
    await db.destroy();
  });

  test('should process deletion event message from queue', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    const testUser = {
      eventType: 'deleted',
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

  test('should delete user for deletion event message from queue', async () => {
    const userId = 'c48cbe05-7472-4821-a599-f68aa4cbca6f';
    const testUser = {
      eventType: 'deleted',
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

    expect(userInDb).toBeUndefined();
  }, 30000);
});
