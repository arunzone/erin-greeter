module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  // Setup files before the tests are run
  setupFilesAfterEnv: ['<rootDir>/test/setup/jest-setup.ts'],
  // Global setup runs once before all tests
  globalSetup: '<rootDir>/test/setup/global-setup.ts',
  // Global teardown runs once after all tests
  globalTeardown: '<rootDir>/test/setup/global-teardown.ts',
  // Increase test timeout since LocalStack needs time to start
  testTimeout: 30000,
  // Run tests in band (sequentially) to avoid port conflicts
  maxWorkers: 1,
  // Enable test coverage
  collectCoverage: true,
  coverageDirectory: 'coverage',
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
      isolatedModules: true
    }
  },
  coverageReporters: ['text', 'lcov'],
  // Setup test environment variables
  testEnvironmentOptions: {
    env: {
      // Enable LocalStack for all tests by default
      RUN_LOCALSTACK: 'true',
      // Default AWS credentials for LocalStack
      AWS_ACCESS_KEY_ID: 'test',
      AWS_SECRET_ACCESS_KEY: 'test',
      AWS_DEFAULT_REGION: 'us-east-1',
      // Disable AWS SDK v2 metadata service to prevent timeouts
      AWS_EC2_METADATA_DISABLED: 'true',
      // Disable AWS SDK v2 credential provider chain
      AWS_SDK_LOAD_CONFIG: 'false',
      // Disable AWS SDK v2 shared config file
      AWS_SDK_LOAD_CREDENTIALS: 'false',
    },
  },
};
