import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as path from 'path';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as sm from 'aws-cdk-lib/aws-secretsmanager';
import { DatabaseConfigRetriever } from './database/DatabaseConfigRetriever';
import { DatabaseConfigProps } from './database/DatabaseConfigProps';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

export interface BirthdayFinderProcessorProps {
  greetingQueue: sqs.IQueue;
  vpc: ec2.IVpc;
  database: rds.DatabaseInstance;
  databaseSecret: sm.Secret;
}

export class BirthdayFinderProcessor extends Construct {
  public readonly fn: lambda.Function;

  constructor(scope: Construct, id: string, props: BirthdayFinderProcessorProps) {
    super(scope, id);

    const { greetingQueue, vpc, databaseSecret, database } = props;

    const lambdaPath = path.join(__dirname, '../../lambda/birthday-finder-handler');
    const databaseConfigProps: DatabaseConfigProps = DatabaseConfigRetriever.getDatabaseConfig(
      this.node,
      database,
      databaseSecret
    );

    this.fn = new NodejsFunction(this, 'BirthdayFinderHandler', {
      vpc,
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(lambdaPath, 'index.ts'),
      handler: 'handler',
      functionName: 'BirthdayFinderHandler',
      environment: {
        LOG_LEVEL: 'INFO',
        DB_HOST: databaseConfigProps.databaseHost,
        DB_PORT: databaseConfigProps.databasePort,
        DB_USERNAME: databaseConfigProps.databaseUsername,
        DB_PASSWORD: databaseConfigProps.databasePassword,
        DB_NAME: databaseConfigProps.databaseName,
        SECRET_ARN: databaseSecret.secretArn,
        GREETING_QUEUE_URL: greetingQueue.queueUrl,
        TARGET_HOUR: '9',
        TARGET_MINUTE: '0',
        WINDOW_MINUTES: '20',
      },
      timeout: cdk.Duration.minutes(2),
      memorySize: 512,
      bundling: {
        minify: false,
        sourceMap: true,
        externalModules: [],
        nodeModules: ['kysely', 'pg', 'luxon', '@aws-sdk/client-sqs'],
        forceDockerBundling: false,
      },
    });

    databaseSecret.grantRead(this.fn);
    greetingQueue.grantSendMessages(this.fn);

    const rule = new events.Rule(this, 'BirthdayFinderSchedule', {
      schedule: events.Schedule.rate(cdk.Duration.minutes(15)),
    });

    rule.addTarget(new targets.LambdaFunction(this.fn));
  }
}
