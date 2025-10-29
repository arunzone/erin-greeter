import { execSync } from 'child_process';
import * as path from 'path';
import { LambdaClient, InvokeCommand, InvokeCommandInput, LogType } from '@aws-sdk/client-lambda';

const localstackConfig = {
  endpoint: 'http://localhost:4566',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
};

const setupDatabse = async () => {
  const payload = JSON.stringify({ key: 'test-value' });
  const lambdaClient = new LambdaClient(localstackConfig);
  const params: InvokeCommandInput = {
    FunctionName: 'DatabaseMigrate',
    Payload: Buffer.from(payload),
    InvocationType: 'RequestResponse',
    LogType: LogType.Tail,
  };

  try {
    await lambdaClient.send(new InvokeCommand(params));
  } catch (error) {
    console.error('Error invoking Lambda:', error);
    fail(`Test failed due to Lambda invocation error: ${error}`);
  }
};
// This file runs once before all tests
export default async function globalSetup() {
  process.env.NODE_ENV = 'test';
  try {
    if (process.env.SKIP_GLOBAL_SETUP === 'true') {
      console.log('Skipping global setup.');
      return;
    }
    console.log('Starting LocalStack...');
    // Start LocalStack if not already running
    try {
      execSync('docker-compose -f docker-compose.yml up -d');
      console.log('Waiting for LocalStack to be ready...');
      const maxRetries = 40;
      for (let i = 0; i < maxRetries; i++) {
        try {
          execSync('curl -f http://localhost:4566/_localstack/health');
          console.log('LocalStack is ready!');
          break;
        } catch (_e) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
      // Use a unique CDK output directory per test run to avoid contention
      const outDir = path.join(process.cwd(), `cdk.out-jest-${process.pid}`);

      // Common environment configuration for CDK operations
      const cdkEnv = {
        ...process.env,
        AWS_REGION: 'us-east-1',
        AWS_ACCESS_KEY_ID: 'test',
        AWS_SECRET_ACCESS_KEY: 'test',
        AWS_ENDPOINT_URL: 'http://localhost:4566',
        AWS_ENDPOINT_URL_S3: 'http://s3.localhost.localstack.cloud:4566',
        AWS_S3_FORCE_PATH_STYLE: '1',
        LOCALSTACK_HOSTNAME: 'localhost',
        CDK_OUTDIR: outDir,
      };

      console.log('Bootstrapping CDK into LocalStack...');
      execSync(
        `NODE_PATH=${process.cwd()}/node_modules npx cdklocal bootstrap --context envType=local --output ${outDir}`,
        {
          stdio: 'inherit',
          shell: '/bin/bash',
          env: cdkEnv,
        }
      );
      console.log('Deploying stack into LocalStack...');
      execSync(
        `NODE_PATH=${process.cwd()}/node_modules npx cdklocal deploy --all --context envType=local --require-approval never --output ${outDir}`,
        {
          stdio: 'inherit',
          shell: '/bin/bash',
          env: cdkEnv,
        }
      );
      await setupDatabse();
    } catch (error) {
      console.error('Error starting LocalStack:', error);
      process.exit(1);
    }
  } catch (error) {
    console.error('Global setup error:', error);
    process.exit(1);
  }
}
