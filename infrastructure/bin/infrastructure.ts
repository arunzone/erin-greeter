#!/opt/homebrew/opt/node/bin/node
import * as cdk from 'aws-cdk-lib';
import { IngestStack } from '../lib/ingest-stack';
import { MigrateStack } from '../lib/migrate-stack';
import { BirthdayGreetingStack } from '../lib/birthday-greeting-stack';
import * as dotenv from 'dotenv';

dotenv.config();

const app = new cdk.App();
const ingestStack = new IngestStack(app, 'IngestStack');
new MigrateStack(app, 'MigrateStack', {
  database: ingestStack.database,
  databaseSecret: ingestStack.databaseSecret,
  vpc: ingestStack.vpc,
  databaseName: ingestStack.databaseName,
});
new BirthdayGreetingStack(app, 'BirthdayGreetingStack', {
  database: ingestStack.database,
  databaseSecret: ingestStack.databaseSecret,
  vpc: ingestStack.vpc,
  databaseName: ingestStack.databaseName,
});
