import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'path';
import { VpcConstruct } from './constructs/VpcConstruct';
import { DatabaseConstruct } from './constructs/DatabaseConstruct';
import { QueuesConstruct } from './constructs/QueuesConstruct';
import { IngestProcessorConstruct } from './constructs/IngestProcessorConstruct';
import { LiquibaseMigratorConstruct } from './constructs/LiquibaseMigratorConstruct';

export class IngestStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC
    const vpc = new VpcConstruct(this, 'Vpc').vpc;

    // Database
    const database = new DatabaseConstruct(this, 'Database', { vpc, dbName: 'greet' });

    // Queues
    const queues = new QueuesConstruct(this, 'Queues');

    // Ingest Processor
    // new IngestProcessorConstruct(this, 'IngestProcessor', {
    //   vpc,
    //   queue: queues.queue,
    //   dbInstance: database.instance,
    // });

    // Liquibase Migrator (hash trigger lives in the construct)
    // new LiquibaseMigratorConstruct(this, 'LiquibaseMigrator', {
    //   vpc,
    //   dbInstance: database.instance,
    //   changelogDir: path.join(__dirname, '../lambda/liquibase-runner/liquibase'),
    // });
  }
}
