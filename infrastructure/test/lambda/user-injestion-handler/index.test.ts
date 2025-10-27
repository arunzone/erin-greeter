import * as cdk from 'aws-cdk-lib';
import {
  SQSClient,
  SendMessageCommand,
  GetQueueAttributesCommand,
} from '@aws-sdk/client-sqs';
import {
  LambdaClient,
  GetFunctionCommand,
} from '@aws-sdk/client-lambda';
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
types.setTypeParser(1082, (stringValue) => {
  return stringValue; // Return the string '1990-01-15' directly
});

describe('SimpleQueueConsumer Lambda Integration Test', () => {
  let app: cdk.App;
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
    console.log('Stack deployed to LocalStack');
    console.log('Queue URL:', queueUrl);
  });

  afterAll(async () => {
    sqsClient.destroy();
    lambdaClient.destroy();
    await db.destroy();
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

    // Clean up any existing user data before test
    await db.deleteFrom('user').where('id', '=', userId).execute();

    console.log('Sending test message:', testUser);

    const sendResult = await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(testUser),
      })
    );

    console.log('Message sent with ID:', sendResult.MessageId);

    console.log('Waiting for Lambda to process...');
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

    console.log(`Messages in queue: ${messagesInQueue}, in flight: ${messagesInFlight}`);

    expect(messagesInQueue).toBe(0);
    expect(messagesInFlight).toBe(0);

  }, 30000);
  
  test.only('should process user message from queue and persisted in database', async () => {
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

    const sendResult = await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(testUser),
      })
    );

    console.log('Message sent with ID:', sendResult.MessageId);

    console.log('Waiting for Lambda to process...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    const userInDb = await db
      .selectFrom('user')
      .where('id', '=', userId)
      .selectAll()
      .executeTakeFirst();

    console.log('User in DB:', userInDb);
    expect(userInDb!.id).toBe(userId);
    expect(userInDb!.first_name).toBe(testUser.user.firstName);
    expect(userInDb!.last_name).toBe(testUser.user.lastName);
    expect(userInDb!.timezone).toBe(testUser.user.timeZone);
    expect(userInDb!.birthday).toBe('1990-01-15');
    expect(userInDb!.created_at).toBeDefined();

    console.log('User successfully validated in database:', userInDb);

    // Clean up test data
    await db.deleteFrom('user').where('id', '=', userId).execute();
  }, 30000);

  it('should verify lambda function exists and is configured', async () => {
    const getFunctionCommand = new GetFunctionCommand({
      FunctionName: 'UserIngestionHandler',
    });

    const functionData = await lambdaClient.send(getFunctionCommand);

    expect(functionData.Configuration).toBeDefined();
    expect(functionData.Configuration?.FunctionName).toBe('UserIngestionHandler');
    expect(functionData.Configuration?.Runtime).toBe('nodejs22.x');
    expect(functionData.Configuration?.Timeout).toBe(30);
  });

  test('should process batch of user messages', async () => {
    const users = [
      { first_name: 'Alice', last_name: 'Smith', birthday: '1985-03-20', timezone: 'UTC' },
      { first_name: 'Bob', last_name: 'Johnson', birthday: '1992-07-15', timezone: 'America/Los_Angeles' },
      { first_name: 'Charlie', last_name: 'Williams', birthday: '1988-11-30', timezone: 'Europe/London' },
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

    expect(messagesInQueue).toBe(0);
  }, 40000);
});