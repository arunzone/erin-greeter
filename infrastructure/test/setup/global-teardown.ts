import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Function to clean up CDK output directories created during tests
function cleanupCdkOutputDirectories() {
  try {
    const testDir = process.cwd();
    const items = fs.readdirSync(testDir, { withFileTypes: true });

    console.log('Cleaning up CDK output directories...');
    let cleanedCount = 0;

    for (const item of items) {
      if (item.isDirectory() && item.name.startsWith('cdk.out-jest-')) {
        const dirPath = path.join(testDir, item.name);
        console.log(`Removing directory: ${item.name}`);
        fs.rmSync(dirPath, { recursive: true, force: true });
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} CDK output directories`);
    } else {
      console.log('No CDK output directories found to clean up');
    }
  } catch (error) {
    console.error('Error during CDK output directory cleanup:', error);
  }
}

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
          AWS_ENDPOINT_URL_S3: 'http://localhost:4566',
        },
      });
    } catch (error) {
      console.error('Error destroying stack (continuing):', error);
    }

    // Stop LocalStack
    try {
      console.log('Stopping LocalStack...');
      execSync('docker-compose -f docker-compose.yml down');
      console.log('LocalStack stopped successfully');
    } catch (error) {
      console.error('Error stopping LocalStack:', error);
    }

    // Clean up CDK output directories
    cleanupCdkOutputDirectories();

    console.log('Test environment teardown complete');
  } catch (error) {
    console.error('Global teardown error:', error);
  }
}
