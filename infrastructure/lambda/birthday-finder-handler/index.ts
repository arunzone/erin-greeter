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
  const service = new BirthdayFinderService(repository, sqsClient, queueUrl);

  try {
    const count = await service.findAndScheduleGreetings();
    console.log(`Successfully scheduled ${count} birthday greetings`);
  } catch (error) {
    console.error('Error finding and scheduling birthday greetings:', error);
    throw error;
  }
};
