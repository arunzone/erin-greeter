import { SQSClient, ListQueuesCommand, GetQueueUrlCommand } from '@aws-sdk/client-sqs';

// Test configuration
const TEST_CONFIG = {
  STACK_NAME: 'IngestStack',
  REGION: 'us-east-1',
  ENDPOINT: 'http://localhost:4566',
  TIMEOUT: 300000, // 5 minutes
  AWS_CREDENTIALS: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
};

// Configure AWS SDK for LocalStack
const sqsClient = new SQSClient({
  region: TEST_CONFIG.REGION,
  endpoint: TEST_CONFIG.ENDPOINT,
  credentials: TEST_CONFIG.AWS_CREDENTIALS,
});

// Helper function to get queue URL by name
async function getQueueUrl(queueName: string): Promise<string | undefined> {
  try {
    const command = new GetQueueUrlCommand({ QueueName: queueName });
    const response = await sqsClient.send(command);
    return response.QueueUrl;
  } catch (error) {
    if (error instanceof Error && error.name === 'QueueDoesNotExist') {
      return undefined;
    }
    throw error;
  }
}

describe('IngestStack Integration Tests', () => {
  test('should have injestion SQS queue created', async () => {
    const response = await sqsClient.send(new ListQueuesCommand({}));
    expect(response.QueueUrls).toBeDefined();
    const q1 = await getQueueUrl('ingestion-queue');
    expect(q1).toBeDefined();
  });
  test('should have dlq queue created', async () => {
    const q2 = await getQueueUrl('ingestion-dlq');
    expect(q2).toBeDefined();
  });
});
