import { types } from 'pg';

export const LOCALSTACK_CONFIG = {
  endpoint: 'http://localhost:4566',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
};

export const TEST_TIMEOUTS = {
  MESSAGE_PROCESSING: 30000,
  LAMBDA_PROCESSING: 10000,
  BATCH_PROCESSING: 30000,
  TEST_TIMEOUT: 30000,
  BATCH_TEST_TIMEOUT: 40000,
};

export const QUEUE_URL = 'http://sqs.us-east-1.localhost:4566/000000000000/ingestion-queue';

export const DATABASE_CONFIG = {
  host: 'localhost',
  port: 5433,
  user: 'test',
  password: 'test',
  database: 'postgres',
  max: 2,
  min: 0,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
};

export const LAMBDA_CONFIG = {
  functionName: 'UserIngestionHandler',
  runtime: 'nodejs22.x',
  timeout: 30,
};

export const setupPostgresTypeParser = () => {
  types.setTypeParser(1082, stringValue => stringValue);
};
