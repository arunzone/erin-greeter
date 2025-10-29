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

describe('UserIngestionQueueConsumer Lambda Integration Updation Test', () => {
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

    // Handle pool errors to prevent unhandled error events during shutdown
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
    const userId = '686D14B7-71AB-437A-B3A2-26F1C77992E5';
    const testUser = {
      eventType: 'updated',
      user: {
        id: userId,
        firstName: 'Tony',
        lastName: 'Robins',
        timeZone: 'America/New_York',
        birthday: '1990-01-15T00:00:00.000Z',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };
    const existingUser = await db
      .insertInto('user')
      .values({
        id: userId,
        first_name: testUser.user.firstName,
        last_name: 'Taylor',
      })
      .returning('id')
      .executeTakeFirst();
    console.log('existingUser: ', existingUser);

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

  test('should update user for updation event message from queue', async () => {
    const userId = '6b3c5afe-a72e-422c-8cfe-3bd7066f6c74';
    const testUser = {
      eventType: 'updated',
      user: {
        id: userId,
        firstName: 'John',
        lastName: 'Marsden',
        timeZone: 'America/New_York',
        birthday: '1990-01-15T00:00:00.000Z',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };
    const existingUser = await db
      .insertInto('user')
      .values({
        id: userId,
        first_name: testUser.user.firstName,
        last_name: 'Taylor',
      })
      .returning('id')
      .executeTakeFirst();
    console.log('existing user: ', existingUser);

    const allUsersInDbBeforeUpdate = await db.selectFrom('user').selectAll().execute();
    console.log('all users before update', allUsersInDbBeforeUpdate);

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

    const allUsersInDb = await db.selectFrom('user').selectAll().execute();
    console.log('all users after update', allUsersInDb);

    expect(userInDb).toMatchObject({
      id: userId,
      first_name: testUser.user.firstName,
      last_name: 'Marsden',
    });
  }, 30000);

  test('should update user birthday for updation event message from queue', async () => {
    const userId = '01c6dec9-d3f8-4cf0-9bbe-2f41e06ee254';
    const testUser = {
      eventType: 'updated',
      user: {
        id: userId,
        firstName: 'Tom',
        lastName: 'Hanks',
        timeZone: 'America/New_York',
        birthday: '1990-01-15T00:00:00.000Z',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    await db
      .insertInto('user')
      .values({
        id: userId,
        first_name: testUser.user.firstName,
        last_name: testUser.user.lastName,
      })
      .execute();
    await db
      .insertInto('user_birthday')
      .values({
        user_id: userId,
        day: 15,
        month: 1,
        year: 1990,
        timezone: 'France/Paris',
      })
      .execute();

    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(testUser),
      })
    );

    await new Promise(resolve => setTimeout(resolve, 10000));

    const userInDb = await db
      .selectFrom('user_birthday')
      .where('user_id', '=', userId)
      .selectAll()
      .executeTakeFirst();

    expect(userInDb).toMatchObject({
      user_id: userId,
      day: 15,
      month: 1,
      year: 1990,
      timezone: testUser.user.timeZone,
    });
  }, 30000);
});
