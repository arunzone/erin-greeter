import { execSync } from 'child_process';

// This file runs once after all tests
export default async function globalTeardown() {
  try {
    console.log('Tearing down test environment...');
    // Destroy CDK stack in LocalStack
    try {
      console.log('Destroying IngestStack from LocalStack...');
      execSync(`NODE_PATH=${process.cwd()}/node_modules npx cdklocal destroy IngestStack --force`, {
        stdio: 'inherit',
        shell: '/bin/bash',
        env: {
          ...process.env,
          AWS_REGION: 'us-east-1',
          AWS_ACCESS_KEY_ID: 'test',
          AWS_SECRET_ACCESS_KEY: 'test',
          AWS_ENDPOINT_URL: 'http://localhost:4566',
          AWS_ENDPOINT_URL_S3: 'http://localhost:4566'
        }
      });
    } catch (error) {
      console.error('Error destroying stack (continuing):', error);
    }

    // Stop LocalStack
    try {
      console.log('Stopping LocalStack...');
      execSync('docker-compose -f docker-compose.localstack.yml down');
      console.log('LocalStack stopped successfully');
    } catch (error) {
      console.error('Error stopping LocalStack:', error);
    }
    
    // Add any additional cleanup here
    
    console.log('Test environment teardown complete');
  } catch (error) {
    console.error('Global teardown error:', error);
  }
}
