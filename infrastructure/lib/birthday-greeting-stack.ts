import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as sm from 'aws-cdk-lib/aws-secretsmanager';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { BirthdayGreetingQueueConstruct } from './constructs/BirthdayGreetingQueueConstruct';
import { BirthdayFinderProcessor } from './constructs/BirthdayFinderProcessor';
import { BirthdayGreeterProcessor } from './constructs/BirthdayGreeterProcessor';

interface BirthdayGreetingStackProps extends cdk.StackProps {
  database: rds.DatabaseInstance;
  databaseSecret: sm.Secret;
  vpc: ec2.Vpc;
  databaseName: string;
}

export class BirthdayGreetingStack extends cdk.Stack {
  public readonly greetingQueue: sqs.Queue;
  public readonly greetingDLQ: sqs.Queue;
  public readonly birthdayFinder: BirthdayFinderProcessor;
  public readonly birthdayGreeter: BirthdayGreeterProcessor;

  constructor(scope: Construct, id: string, props: BirthdayGreetingStackProps) {
    super(scope, id, props);

    const { database, databaseSecret, vpc } = props;

    const requestBinUrl =
      this.node.tryGetContext('requestBinUrl') ||
      process.env.REQUESTBIN_URL;

    const queueConstruct = new BirthdayGreetingQueueConstruct(this, 'BirthdayGreetingQueues');
    this.greetingQueue = queueConstruct.queue;
    this.greetingDLQ = queueConstruct.dlq;

    this.birthdayFinder = new BirthdayFinderProcessor(this, 'BirthdayFinder', {
      vpc,
      database,
      databaseSecret,
      greetingQueue: this.greetingQueue,
    });

    this.birthdayGreeter = new BirthdayGreeterProcessor(this, 'BirthdayGreeter', {
      vpc,
      database,
      databaseSecret,
      greetingQueue: this.greetingQueue,
      requestBinUrl,
    });
  }
}
