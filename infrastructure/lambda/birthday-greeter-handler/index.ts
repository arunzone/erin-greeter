import { SQSEvent, SQSHandler, SQSBatchResponse } from 'aws-lambda';
import { DatabaseConnectionManager } from '../user-ingestion-handler/repository/DatabaseConnectionManager';
import axios from 'axios';
import { sql } from 'kysely';

interface GreetingMessage {
  userId: string;
  firstName: string;
  lastName: string;
  year: number;
}

export const handler: SQSHandler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  console.log(`Processing ${event.Records.length} birthday greeting messages`);

  const dbManager = new DatabaseConnectionManager();
  const db = dbManager.getDatabase();
  const requestBinUrl = process.env.REQUESTBIN_URL!;

  const batchItemFailures: SQSBatchResponse['batchItemFailures'] = [];

  for (const record of event.Records) {
    try {
      const message: GreetingMessage = JSON.parse(record.body);
      console.log(`Processing greeting for user ${message.userId}`);

      const updated = await db
        .updateTable('user_birthday')
        .set({ sent_year: message.year })
        .where('user_id', '=', message.userId)
        .where(eb =>
          eb.or([eb('sent_year', 'is', null), eb('sent_year', '<', message.year)])
        )
        .returning('id')
        .executeTakeFirst();

      if (!updated) {
        console.log(`User ${message.userId} already greeted this year, skipping`);
        continue;
      }

      const greetingText = `Hey, ${message.firstName} ${message.lastName} it's your birthday!`;

      await axios.post(requestBinUrl, {
        message: greetingText,
        userId: message.userId,
        timestamp: new Date().toISOString(),
      });

      console.log(`Sent birthday greeting to ${message.firstName} ${message.lastName}`);
    } catch (error) {
      console.error(`Failed to process message ${record.messageId}:`, error);
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
