import { SQSEvent, SQSHandler, SQSBatchResponse } from 'aws-lambda';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool, types } from 'pg';
import { z } from 'zod';
import { Database } from './types';
import * as moment from 'moment';

// Zod schema for incoming user message
const UserDataSchema = z.object({
  id: z.uuid(),
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
  timeZone: z.string(),
  birthday: z.iso.datetime().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const UserMessageSchema = z.object({
  eventType: z.enum(['created', 'updated', 'deleted']),
  user: UserDataSchema,
  timestamp: z.iso.datetime(),
});

type UserMessage = z.infer<typeof UserMessageSchema>;
type UserData = z.infer<typeof UserDataSchema>;

types.setTypeParser(1082, (stringValue) => {
  return stringValue;
});
// Create database connection
const createDb = () => {
  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        max: 2,
        min: 0,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 5000,
      }),
    }),
  });
};

// Process and insert user into database
const processUserMessage = async (db: Kysely<Database>, message: UserMessage) => {
  console.log('Processing event:', message.eventType);
  console.log('User data:', JSON.stringify(message.user, null, 2));

  const userData = message.user;

  let birthdayDateString: string | undefined = undefined;
  if (userData.birthday) {
    birthdayDateString = moment.utc(userData.birthday).format('YYYY-MM-DD');
  }
  // Check if user already exists
  const existingUser = await db
    .selectFrom('user')
    .selectAll()
    .where('id', '=', userData.id)
    .executeTakeFirst();

  if (existingUser) {
    console.log(`User ${userData.id} already exists, skipping insert`);
    return existingUser;
  }

  // Insert user into database
  const insertedUser = await db
    .insertInto('user')
    .values({
      id: userData.id,
      first_name: userData.firstName,
      last_name: userData.lastName,
      birthday: birthdayDateString,
      timezone: userData.timeZone,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  console.log('User inserted successfully:', {
    id: insertedUser.id,
    name: `${insertedUser.first_name} ${insertedUser.last_name}`,
    birthday: insertedUser.birthday,
    timezone: insertedUser.timezone,
    created_at: insertedUser.created_at,
  });

  return insertedUser;
};

export const handler: SQSHandler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  console.log('User ingestion event:', JSON.stringify(event, null, 2));
  console.log(`Processing ${event.Records.length} messages`);

  const db = createDb();
  const batchItemFailures: SQSBatchResponse['batchItemFailures'] = [];

  try {
    // Print all rows from user table
    await printAllUsers(db);

    for (const record of event.Records) {
      try {
        console.log(`Processing message ${record.messageId}`);

        const messageBody = JSON.parse(record.body);
        const validatedMessage = UserMessageSchema.parse(messageBody);
        await processUserMessage(db, validatedMessage);

        console.log(`Message ${record.messageId} processed successfully`);
      } catch (error) {
        console.error(`Failed to process message ${record.messageId}:`, error);
        if (error instanceof z.ZodError) {
          console.error('Validation errors:', JSON.stringify(error.message, null, 2));
        }

        batchItemFailures.push({
          itemIdentifier: record.messageId,
        });
      }
    }

    const successCount = event.Records.length - batchItemFailures.length;
    console.log(
      `Batch processing complete. Success: ${successCount}, Failures: ${batchItemFailures.length}`
    );
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  } finally {
    // Clean up database connection
    await db.destroy();
    console.log('Database connection closed');
  }

  return {
    batchItemFailures,
  };
};

async function printAllUsers(db: Kysely<Database>) {
  const allUsers = await db
    .selectFrom('user')
    .selectAll()
    .execute();

  console.log(`Found ${allUsers.length} users in database:`);
  allUsers.forEach((user, index) => {
    console.log(`User ${index + 1}:`, {
      id: user.id,
      name: `${user.first_name} ${user.last_name}`,
      birthday: user.birthday,
      timezone: user.timezone,
      created_at: user.created_at,
    });
  });
}
