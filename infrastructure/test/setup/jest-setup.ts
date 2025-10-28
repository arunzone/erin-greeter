// Configure test environment variables
process.env.LOCALSTACK_URL = process.env.LOCALSTACK_URL || 'http://localhost:4566';

// Set a test timeout of 30 seconds
jest.setTimeout(30000);
