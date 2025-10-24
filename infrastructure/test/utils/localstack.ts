import axios from 'axios';

const LOCALSTACK_URL = process.env.LOCALSTACK_URL || 'http://127.0.0.1:4566';
const TIMEOUT = 60000; // 60 seconds
const CHECK_INTERVAL = 2000; // 2 seconds

// Simple AWS config for LocalStack
export function getLocalStackConfig() {
  return {
    endpoint: LOCALSTACK_URL,
    region: 'us-east-1',
    accessKeyId: 'test',
    secretAccessKey: 'test',
    s3ForcePathStyle: true,
  };
}

// Check if a service is available
function isServiceReady(services: any, serviceName: string) {
  const status = services[serviceName];
  return status === 'running' || status === 'available';
}

// Main function to wait for LocalStack services
export async function waitForLocalStack(requiredServices: string[] = ['secretsmanager']) {
  const startTime = Date.now();
  console.log(`Waiting for LocalStack services: ${requiredServices.join(', ')}`);

  while (Date.now() - startTime < TIMEOUT) {
    try {
      const response = await axios.get(`${LOCALSTACK_URL}/_localstack/health`, {
        timeout: 2000,
      });

      if (response.status === 200 && response.data?.services) {
        const readyServices: string[] = [];
        const allReady = requiredServices.every(service => {
          const ready = isServiceReady(response.data.services, service);
          if (ready) readyServices.push(service);
          return ready;
        });

        if (allReady) {
          console.log(`Ready! Services available: ${readyServices.join(', ')}`);
          return true;
        }
      }
    } catch (error) {
      // Ignore errors and retry
    }

    await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    console.log(`Waiting... (${elapsed}s)`);
  }

  throw new Error(`LocalStack not ready after ${TIMEOUT/1000} seconds`);
}
