#!/opt/homebrew/opt/node/bin/node
import * as cdk from 'aws-cdk-lib';
import { IngestStack } from '../lib/ingest-stack';
import { MigrateStack } from '../lib/migrate-stack';

const app = new cdk.App();
const ingestStack = new IngestStack(app, 'IngestStack');
new MigrateStack(app, 'MigrateStack', {
  database: ingestStack.database,
  databaseSecret: ingestStack.databaseSecret,
  vpc: ingestStack.vpc,
  databaseName: ingestStack.databaseName,
});
