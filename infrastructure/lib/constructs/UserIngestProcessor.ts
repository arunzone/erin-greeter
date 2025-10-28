import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as event_sources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as path from 'path';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as sm from 'aws-cdk-lib/aws-secretsmanager';
import { DatabaseConfigRetriever } from './database/DatabaseConfigRetriever';
import { DatabaseConfigProps } from './database/DatabaseConfigProps';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

export interface UserIngestProcessorProps {
  queue: sqs.IQueue;
  vpc: ec2.IVpc;
  database: rds.DatabaseInstance;
  databaseSecret: sm.Secret;
}

export class UserIngestProcessor extends Construct {
  public readonly fn: lambda.Function;

  constructor(scope: Construct, id: string, props: UserIngestProcessorProps) {
    super(scope, id);

    const { queue, vpc, databaseSecret, database } = props;

    const lambdaPath = path.join(__dirname, '../../lambda/user-ingestion-handler');
    const databaseConfigProps: DatabaseConfigProps = DatabaseConfigRetriever.getDatabaseConfig(
      this.node,
      database,
      databaseSecret
    );

    // Use NodejsFunction for automatic bundling with esbuild
    this.fn = new NodejsFunction(this, 'UserIngestionHandler', {
      vpc,
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(lambdaPath, 'index.ts'),
      handler: 'handler',
      functionName: 'UserIngestionHandler',
      environment: {
        LOG_LEVEL: 'INFO',
        DB_HOST: databaseConfigProps.databaseHost,
        DB_PORT: databaseConfigProps.databasePort,
        DB_USERNAME: databaseConfigProps.databaseUsername,
        DB_PASSWORD: databaseConfigProps.databasePassword,
        DB_NAME: databaseConfigProps.databaseName,
        SECRET_ARN: databaseSecret.secretArn,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      bundling: {
        minify: false,
        sourceMap: true,
        externalModules: ['aws-sdk'],
        nodeModules: ['kysely', 'pg', 'zod'],
        // Prefer local bundling to avoid Docker permission issues on ARM Mac
        forceDockerBundling: false,
      },
    });

    databaseSecret.grantRead(this.fn);

    this.fn.addEventSource(
      new event_sources.SqsEventSource(queue, {
        batchSize: 10,
        maxBatchingWindow: cdk.Duration.seconds(5),
        reportBatchItemFailures: true,
      })
    );
  }
}
