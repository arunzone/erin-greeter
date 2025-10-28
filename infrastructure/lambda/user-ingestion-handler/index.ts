import { SQSEvent, SQSHandler, SQSBatchResponse } from 'aws-lambda';
import { z } from 'zod';
import { UserMessageSchema } from './model';
import { PostgresUserRepository } from './repository/PostgresUserRepository';
import { DatabaseConnectionManager } from './repository/DatabaseConnectionManager';
import { UserService } from './service/UserService';
import { PostgresUserBirthdayRepository } from './repository/PostgresUserBirthdayRepository';
import { TransactionManager } from './persistence/TransactionManager';

export const handler: SQSHandler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  console.log('User ingestion event:', JSON.stringify(event, null, 2));
  console.log(`Processing ${event.Records.length} messages`);

  const dbManager = new DatabaseConnectionManager();
  const userRepository = new PostgresUserRepository(dbManager);
  const userBirthdayRepository = new PostgresUserBirthdayRepository(dbManager);
  const transactionManager = new TransactionManager(dbManager.getDatabase());
  const userService = new UserService(userRepository, userBirthdayRepository, transactionManager);
  const batchItemFailures: SQSBatchResponse['batchItemFailures'] = [];

  try {
    // Print all rows from user table
    await userService.printAllUsers();

    for (const record of event.Records) {
      try {
        console.log(`Processing message ${record.messageId}`);

        const messageBody = JSON.parse(record.body);
        const validatedMessage = UserMessageSchema.parse(messageBody);
        await userService.processUserMessage(validatedMessage);

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
    // If it's a connection error, reset the cache
    if (error instanceof Error && error.message.includes('connection')) {
      DatabaseConnectionManager.resetCache();
    }
    throw error;
  } finally {
    // Don't close cached connection - reuse for next invocation
    console.log('Database connection cached for next Lambda invocation');
  }

  return {
    batchItemFailures,
  };
};
