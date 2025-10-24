// Configure AWS SDK to use LocalStack
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'test';
process.env.AWS_SECRET_ACCESS_KEY = 'test';
process.env.AWS_ENDPOINT = 'http://localhost:4566';
process.env.LOCALSTACK_HOSTNAME = 'localhost';

// Global test timeout
jest.setTimeout(300000); // 5 minutes

// Global setup that runs once before all tests
beforeAll(() => {
  console.log('Starting integration tests with LocalStack...');});

// Global teardown that runs once after all tests
afterAll(() => {
  console.log('Integration tests completed');
});
