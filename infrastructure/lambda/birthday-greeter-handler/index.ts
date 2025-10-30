import { SQSEvent, SQSHandler, SQSBatchResponse } from 'aws-lambda';
import { z } from 'zod';
import { GreetingMessageSchema } from './model';
import { DatabaseConnectionManager } from './repository/DatabaseConnectionManager';
import { PostgresBirthdayGreetingRepository } from './repository/PostgresBirthdayGreetingRepository';
import { HttpGreetingClient } from './client/HttpGreetingClient';
import { BirthdayGreetingService } from './service/BirthdayGreetingService';

export const handler: SQSHandler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  console.log(`Processing ${JSON.stringify(event)} message`);
  console.log(`Processing ${event.Records.length} birthday greeting messages`);

  const dbManager = new DatabaseConnectionManager();
  const repository = new PostgresBirthdayGreetingRepository(dbManager);
  const greetingClient = new HttpGreetingClient(process.env.REQUESTBIN_URL!);
  const service = new BirthdayGreetingService(repository, greetingClient);

  const batchItemFailures: SQSBatchResponse['batchItemFailures'] = [];

  for (const record of event.Records) {
    try {

      const messageBody = JSON.parse(record.body);
      const validatedMessage = GreetingMessageSchema.parse(messageBody);

      await service.processGreeting(validatedMessage);

      console.log(`Message ${record.messageId} processed successfully`);
    } catch (error) {
      console.error(`Failed to process message ${record.messageId}:`, error);
      if (error instanceof z.ZodError) {
        console.error('Validation errors:', JSON.stringify(error.issues, null, 2));
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

  return {
    batchItemFailures,
  };
};
