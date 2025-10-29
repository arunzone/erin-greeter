import {
  SQSClient,
  SendMessageCommand,
  GetQueueAttributesCommand,
} from '@aws-sdk/client-sqs';
import { QUEUE_URL, TEST_TIMEOUTS } from './testConfig';

export const sendMessageToQueue = async (sqsClient: SQSClient, message: unknown): Promise<void> => {
  await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify(message),
    })
  );
};

export const sendBatchMessagesToQueue = async (
  sqsClient: SQSClient,
  messages: unknown[]
): Promise<void> => {
  for (const message of messages) {
    await sendMessageToQueue(sqsClient, message);
  }
};

export const waitForLambdaProcessing = async (
  sqsClient: SQSClient,
  timeout: number = TEST_TIMEOUTS.LAMBDA_PROCESSING,
  interval: number = 1000
): Promise<void> => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const status = await getQueueStatus(sqsClient);
    if (status.messagesInFlight === 0 && status.messagesInQueue === 0) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error(`Lambda processing timed out after ${timeout}ms`);
};

export interface QueueStatus {
  messagesInQueue: number;
  messagesInFlight: number;
}

export const getQueueStatus = async (sqsClient: SQSClient): Promise<QueueStatus> => {
  const queueAttributes = await sqsClient.send(
    new GetQueueAttributesCommand({
      QueueUrl: QUEUE_URL,
      AttributeNames: ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible'],
    })
  );

  return {
    messagesInQueue: parseInt(
      queueAttributes.Attributes?.ApproximateNumberOfMessages || '0'
    ),
    messagesInFlight: parseInt(
      queueAttributes.Attributes?.ApproximateNumberOfMessagesNotVisible || '0'
    ),
  };
};
