import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as cdk from 'aws-cdk-lib';

export class QueuesConstruct extends Construct {
  public readonly queue: sqs.Queue;
  public readonly dlq: sqs.Queue;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.dlq = new sqs.Queue(this, 'DLQ', {
      queueName: 'ingestion-dlq',
      retentionPeriod: cdk.Duration.days(2),
    });

    this.queue = new sqs.Queue(this, 'Queue', {
      queueName: 'ingestion-queue',
      deadLetterQueue: {
        queue: this.dlq,
        maxReceiveCount: 3,
      },
      visibilityTimeout: cdk.Duration.seconds(30),
    });
  }
}
