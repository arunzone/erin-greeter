export interface AwsConfig {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sqsQueueUrl: string;
}

export interface AppConfig {
  aws: AwsConfig;
  port: number;
  databaseUrl: string;
}

export function loadConfig(): AppConfig {
  return {
    aws: {
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sqsQueueUrl: process.env.SQS_QUEUE_URL || '',
    },
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    databaseUrl: process.env.DATABASE_URL || 'postgres://app:app@localhost:5432/user_service',
  };
}
