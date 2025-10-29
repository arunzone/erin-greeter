import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { SQSClient, ReceiveMessageCommand, GetQueueAttributesCommand } from '@aws-sdk/client-sqs';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { Database } from '../../../lambda/user-ingestion-handler/types';
import { DateTime } from 'luxon';

const localstackConfig = {
  endpoint: 'http://localhost:4566',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
};

describe('BirthdayFinderHandler Integration Test', () => {
  let lambdaClient: LambdaClient;
  let sqsClient: SQSClient;
  let db: Kysely<Database>;
  let queueUrl: string;

  beforeAll(async () => {
    lambdaClient = new LambdaClient({
      region: localstackConfig.region,
      endpoint: localstackConfig.endpoint,
      credentials: localstackConfig.credentials,
    });

    sqsClient = new SQSClient({
      region: localstackConfig.region,
      endpoint: localstackConfig.endpoint,
      credentials: localstackConfig.credentials,
    });

    queueUrl = 'http://sqs.us-east-1.localhost:4566/000000000000/birthday-greeting-queue';

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

  afterEach(async () => {
    await db.deleteFrom('user_birthday').execute();
    await db.deleteFrom('user').execute();
  });

  test('should invoke Lambda successfully', async () => {
    const command = new InvokeCommand({
      FunctionName: 'BirthdayFinderHandler',
      InvocationType: 'RequestResponse',
    });

    const response = await lambdaClient.send(command);

    expect(response.StatusCode).toBe(200);
  });

  test('should find no users when database is empty', async () => {
    const command = new InvokeCommand({
      FunctionName: 'BirthdayFinderHandler',
      InvocationType: 'RequestResponse',
    });

    await lambdaClient.send(command);

    await new Promise(resolve => setTimeout(resolve, 2000));

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
  });

  test('should send message to SQS when user birthday is in time window', async () => {
    const now = DateTime.now();
    const estTimezone = 'America/New_York';
    const estNow = now.setZone(estTimezone);

    const estHour = estNow.hour;
    const estMinute = estNow.minute;
    const totalMinutes = estHour * 60 + estMinute;

    if (totalMinutes < 525 || totalMinutes > 545) {
      console.log(`Skipping test: Current time ${estHour}:${estMinute} is outside 8:45-9:05 window`);
      return;
    }

    const userId = '123e4567-e89b-12d3-a456-426614174000';

    await db
      .insertInto('user')
      .values({
        id: userId,
        first_name: 'John',
        last_name: 'Doe',
      })
      .execute();

    await db
      .insertInto('user_birthday')
      .values({
        user_id: userId,
        day: estNow.day,
        month: estNow.month,
        year: 1990,
        timezone: estTimezone,
        sent_year: null,
      })
      .execute();

    const command = new InvokeCommand({
      FunctionName: 'BirthdayFinderHandler',
      InvocationType: 'RequestResponse',
    });

    await lambdaClient.send(command);

    await new Promise(resolve => setTimeout(resolve, 3000));

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
    const totalMessages = messagesInQueue + messagesInFlight;

    expect(totalMessages).toBeGreaterThan(0);
  });

  test('should not send message when user birthday is not today', async () => {
    const now = DateTime.now();
    const timezone = 'America/New_York';
    const localNow = now.setZone(timezone);
    const differentMonth = localNow.month === 12 ? 1 : localNow.month + 1;

    const userId = 'c48cbe05-7472-4821-a599-f68aa4cbca60';

    await db
      .insertInto('user')
      .values({
        id: userId,
        first_name: 'Jane',
        last_name: 'Smith',
      })
      .execute();

    await db
      .insertInto('user_birthday')
      .values({
        user_id: userId,
        day: localNow.day,
        month: differentMonth,
        year: 1985,
        timezone: timezone,
        sent_year: null,
      })
      .execute();

    const command = new InvokeCommand({
      FunctionName: 'BirthdayFinderHandler',
      InvocationType: 'RequestResponse',
    });

    await lambdaClient.send(command);

    await new Promise(resolve => setTimeout(resolve, 2000));

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
  });

  test('should not send message when user already greeted this year', async () => {
    const now = DateTime.now();
    const timezone = 'America/New_York';
    const localNow = now.setZone(timezone);
    const currentYear = localNow.year;

    const userId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567891';

    await db
      .insertInto('user')
      .values({
        id: userId,
        first_name: 'Bob',
        last_name: 'Johnson',
      })
      .execute();

    await db
      .insertInto('user_birthday')
      .values({
        user_id: userId,
        day: localNow.day,
        month: localNow.month,
        year: 1992,
        timezone: timezone,
        sent_year: currentYear,
      })
      .execute();

    const command = new InvokeCommand({
      FunctionName: 'BirthdayFinderHandler',
      InvocationType: 'RequestResponse',
    });

    await lambdaClient.send(command);

    await new Promise(resolve => setTimeout(resolve, 2000));

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
  });

  test('should verify Lambda function exists', async () => {
    const command = new InvokeCommand({
      FunctionName: 'BirthdayFinderHandler',
      InvocationType: 'RequestResponse',
    });

    const response = await lambdaClient.send(command);

    expect(response.FunctionError).toBeUndefined();
  });
}, 60000);
