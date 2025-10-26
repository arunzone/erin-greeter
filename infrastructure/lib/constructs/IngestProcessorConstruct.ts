import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as event_sources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';

export interface IngestProcessorConstructProps {
  vpc: ec2.IVpc;
  queue: sqs.IQueue;
  dbInstance: rds.DatabaseInstance;
}

export class IngestProcessorConstruct extends Construct {
  public readonly fn: lambda.Function;

  constructor(scope: Construct, id: string, props: IngestProcessorConstructProps) {
    super(scope, id);

    this.fn = new lambda.Function(this, 'Handler', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda'),
      vpc: props.vpc,
      environment: {
        DB_SECRET_ARN: props.dbInstance.secret!.secretArn,
        DB_HOST: props.dbInstance.dbInstanceEndpointAddress,
        DB_NAME: 'messages',
      },
      timeout: cdk.Duration.seconds(10),
      logRetention: logs.RetentionDays.ONE_DAY,
    });

    props.dbInstance.secret!.grantRead(this.fn);
    this.fn.addEventSource(new event_sources.SqsEventSource(props.queue));
  }
}
