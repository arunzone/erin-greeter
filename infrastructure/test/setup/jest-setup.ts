// Configure test environment variables
process.env.LOCALSTACK_URL = process.env.LOCALSTACK_URL || 'http://localhost:4566';

// Set a test timeout of 30 seconds
jest.setTimeout(30000);

// Jest globals (beforeAll, afterAll, beforeEach, afterEach) are already available in the test environment

// Global setup that runs once before all tests
beforeAll(async () => {
  // Setup code that should run once before all tests
  console.log('Global test setup');
});

// Global teardown that runs once after all tests
afterAll(async () => {
  // Cleanup any test resources here
  console.log('Global test teardown');
});

// Runs before each test
beforeEach(() => {
  // Setup code that should run before each test
});

// Runs after each test
afterEach(() => {
  // Teardown code that should run after each test
});
