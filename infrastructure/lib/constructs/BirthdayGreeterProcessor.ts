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

export interface BirthdayGreeterProcessorProps {
  greetingQueue: sqs.IQueue;
  vpc: ec2.IVpc;
  database: rds.DatabaseInstance;
  databaseSecret: sm.Secret;
  requestBinUrl?: string;
}

export class BirthdayGreeterProcessor extends Construct {
  public readonly fn: lambda.Function;

  constructor(scope: Construct, id: string, props: BirthdayGreeterProcessorProps) {
    super(scope, id);

    const { greetingQueue, vpc, databaseSecret, database, requestBinUrl } = props;

    const lambdaPath = path.join(__dirname, '../../lambda/birthday-greeter-handler');
    const databaseConfigProps: DatabaseConfigProps = DatabaseConfigRetriever.getDatabaseConfig(
      this.node,
      database,
      databaseSecret
    );

    const finalRequestBinUrl =
      requestBinUrl ||
      this.node.tryGetContext('requestBinUrl') ||
      process.env.REQUESTBIN_URL;

    const birthdayGreeterSecurityGroup = new ec2.SecurityGroup(this, 'BirthdayGreeterSecurityGroup', {
      vpc,
      description: 'Security group for Birthday Greeter Lambda',
      allowAllOutbound: true,
    });

    this.fn = new NodejsFunction(this, 'BirthdayGreeterHandler', {
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [birthdayGreeterSecurityGroup],
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(lambdaPath, 'index.ts'),
      handler: 'handler',
      functionName: 'BirthdayGreeterHandler',
      environment: {
        LOG_LEVEL: 'INFO',
        DB_HOST: databaseConfigProps.databaseHost,
        DB_PORT: databaseConfigProps.databasePort,
        DB_USERNAME: databaseConfigProps.databaseUsername,
        DB_PASSWORD: databaseConfigProps.databasePassword,
        DB_NAME: databaseConfigProps.databaseName,
        SECRET_ARN: databaseSecret.secretArn,
        REQUESTBIN_URL: finalRequestBinUrl,
      },
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
      bundling: {
        minify: false,
        sourceMap: true,
        externalModules: [],
        nodeModules: ['kysely', 'pg', 'axios'],
        forceDockerBundling: false,
      },
    });

    databaseSecret.grantRead(this.fn);

    this.fn.addEventSource(
      new event_sources.SqsEventSource(greetingQueue, {
        batchSize: 10,
        maxBatchingWindow: cdk.Duration.seconds(5),
        reportBatchItemFailures: true,
        maxConcurrency: 500,
      })
    );
  }
}
