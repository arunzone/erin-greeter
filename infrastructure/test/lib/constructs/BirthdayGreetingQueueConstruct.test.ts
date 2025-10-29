import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { BirthdayGreetingQueueConstruct } from '../../../lib/constructs/BirthdayGreetingQueueConstruct';

describe('BirthdayGreetingQueueConstruct', () => {
  let stack: cdk.Stack;
  let construct: BirthdayGreetingQueueConstruct;

  beforeEach(() => {
    stack = new cdk.Stack();
    construct = new BirthdayGreetingQueueConstruct(stack, 'TestQueue');
  });

  test('should create main queue', () => {
    expect(construct.queue).toBeDefined();
  });

  test('should create DLQ', () => {
    expect(construct.dlq).toBeDefined();
  });

  test('should configure DLQ with 14 day retention', () => {
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::SQS::Queue', {
      QueueName: 'birthday-greeting-dlq',
      MessageRetentionPeriod: 1209600,
    });
  });

  test('should configure main queue with 4 day retention', () => {
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::SQS::Queue', {
      QueueName: 'birthday-greeting-queue',
      MessageRetentionPeriod: 345600,
    });
  });

  test('should configure main queue with 60 second visibility timeout', () => {
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::SQS::Queue', {
      QueueName: 'birthday-greeting-queue',
      VisibilityTimeout: 60,
    });
  });

  test('should configure dead letter queue with max receive count of 3', () => {
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::SQS::Queue', {
      QueueName: 'birthday-greeting-queue',
      RedrivePolicy: {
        maxReceiveCount: 3,
      },
    });
  });

  test('should create exactly 2 queues', () => {
    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::SQS::Queue', 2);
  });
});
