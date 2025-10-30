import { ScheduledEvent } from 'aws-lambda';
import { DatabaseConnectionManager } from '../user-ingestion-handler/repository/DatabaseConnectionManager';
import { BirthdayRepository } from './repository/BirthdayRepository';
import { BirthdayFinderService } from './service/BirthdayFinderService';
import { SQSClient } from '@aws-sdk/client-sqs';

export const handler = async (event: ScheduledEvent): Promise<void> => {
  console.log('Birthday Finder Lambda triggered:', JSON.stringify(event, null, 2));

  const dbManager = new DatabaseConnectionManager();
  const repository = new BirthdayRepository(dbManager.getDatabase());

  const sqsClient = new SQSClient({
    region: process.env.AWS_REGION || 'us-east-1',
  });

  const queueUrl = process.env.GREETING_QUEUE_URL!;
  const targetHour = parseInt(process.env.TARGET_HOUR || '9', 10);
  const targetMinute = parseInt(process.env.TARGET_MINUTE || '0', 10);
  const windowMinutes = parseInt(process.env.WINDOW_MINUTES || '20', 10);

  const service = new BirthdayFinderService(
    repository,
    sqsClient,
    queueUrl,
    targetHour,
    targetMinute,
    windowMinutes
  );

  try {
    const count = await service.findAndScheduleGreetings();
    console.log(`Successfully scheduled ${count} birthday greetings`);
  } catch (error) {
    console.error('Error finding and scheduling birthday greetings:', error);
    throw error;
  }
};
