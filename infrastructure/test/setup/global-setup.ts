import { execSync } from 'child_process';
import * as path from 'path';

// This file runs once before all tests
export default async function globalSetup() {
  try {
    console.log('Starting LocalStack...');
    // Start LocalStack if not already running
    try {
      execSync('docker-compose -f docker-compose.localstack.yml up -d');
      console.log('Waiting for LocalStack to be ready...');
      const maxRetries = 40;
      for (let i = 0; i < maxRetries; i++) {
        try {
          execSync('curl -f http://localhost:4566/_localstack/health');
          console.log('LocalStack is ready!');
          break;
        } catch (e) {
          await new Promise((r) => setTimeout(r, 2000));
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
        CDK_OUTDIR: outDir
      };

      console.log('Bootstrapping CDK into LocalStack...');
      execSync(`NODE_PATH=${process.cwd()}/node_modules npx cdklocal bootstrap --output ${outDir}`, {
        stdio: 'inherit',
        shell: '/bin/bash',
        env: cdkEnv
      });
      console.log('Deploying stack into LocalStack...');
      execSync(`NODE_PATH=${process.cwd()}/node_modules npx cdklocal deploy IngestStack --require-approval never --output ${outDir}`, {
        stdio: 'inherit',
        shell: '/bin/bash',
        env: cdkEnv
      });
    } catch (error) {
      console.error('Error starting LocalStack:', error);
      process.exit(1);
    }
  } catch (error) {
    console.error('Global setup error:', error);
    process.exit(1);
  }
}
