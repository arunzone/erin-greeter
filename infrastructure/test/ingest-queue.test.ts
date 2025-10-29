import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { IngestStack } from '../lib/ingest-stack';

describe('IngestStack SQS Queues', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new IngestStack(app, 'IngestStackQueue');
    template = Template.fromStack(stack);
  });

  describe('Main Queue', () => {
    test('should be configured correctly', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'ingestion-queue',
        VisibilityTimeout: 30,
        RedrivePolicy: {
          maxReceiveCount: 3,
          deadLetterTargetArn: Match.anyValue(),
        },
      });
    });
  });

  describe('Dead-Letter Queue', () => {
    test('should be configured correctly', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'ingestion-dlq',
        MessageRetentionPeriod: 172800,
        RedrivePolicy: Match.absent(),
      });
    });
  });
});
