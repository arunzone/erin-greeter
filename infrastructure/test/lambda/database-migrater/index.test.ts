import { LambdaClient, InvokeCommand, InvokeCommandInput, LogType } from '@aws-sdk/client-lambda';

const localstackConfig = {
  endpoint: 'http://localhost:4566',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
};

const lambdaClient = new LambdaClient(localstackConfig);

describe('Lambda Function Invocation', () => {
  const functionName = 'DatabaseMigrate';

  it('should handle database migration failure correctly', async () => {
    const payload = JSON.stringify({ key: 'test-value' });

    const params: InvokeCommandInput = {
      FunctionName: functionName,
      Payload: Buffer.from(payload),
      InvocationType: 'RequestResponse',
      LogType: LogType.Tail,
    };

    try {
      const command = new InvokeCommand(params);
      const response = await lambdaClient.send(command);

      const responsePayload = Buffer.from(response.Payload!).toString('utf-8');
      const parsedPayload = JSON.parse(responsePayload);

      expect(response.StatusCode).toBe(200);
      expect(parsedPayload.body).toContain('Migrations completed');
    } catch (error) {
      console.error('Error invoking Lambda:', error);
      fail(`Test failed due to Lambda invocation error: ${error}`);
    }
  });
});
