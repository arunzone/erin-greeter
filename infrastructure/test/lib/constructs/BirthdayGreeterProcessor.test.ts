import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as sm from 'aws-cdk-lib/aws-secretsmanager';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { BirthdayGreeterProcessor } from '../../../lib/constructs/BirthdayGreeterProcessor';

describe('BirthdayGreeterProcessor', () => {
  let stack: cdk.Stack;
  let vpc: ec2.Vpc;
  let database: rds.DatabaseInstance;
  let databaseSecret: sm.Secret;
  let greetingQueue: sqs.Queue;

  beforeEach(() => {
    stack = new cdk.Stack();
    vpc = new ec2.Vpc(stack, 'TestVpc');
    databaseSecret = new sm.Secret(stack, 'TestSecret');
    database = new rds.DatabaseInstance(stack, 'TestDatabase', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_16_6 }),
      vpc,
      credentials: rds.Credentials.fromSecret(databaseSecret),
    });
    greetingQueue = new sqs.Queue(stack, 'TestQueue');
  });

  test('should create Lambda function', () => {
    const processor = new BirthdayGreeterProcessor(stack, 'TestProcessor', {
      vpc,
      database,
      databaseSecret,
      greetingQueue,
    });

    expect(processor.fn).toBeDefined();
  });

  test('should configure Lambda with 60 second timeout', () => {
    new BirthdayGreeterProcessor(stack, 'TestProcessor', {
      vpc,
      database,
      databaseSecret,
      greetingQueue,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'BirthdayGreeterHandler',
      Timeout: 60,
    });
  });

  test('should configure Lambda with 512MB memory', () => {
    new BirthdayGreeterProcessor(stack, 'TestProcessor', {
      vpc,
      database,
      databaseSecret,
      greetingQueue,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'BirthdayGreeterHandler',
      MemorySize: 512,
    });
  });

  test('should configure Lambda with Node 22 runtime', () => {
    new BirthdayGreeterProcessor(stack, 'TestProcessor', {
      vpc,
      database,
      databaseSecret,
      greetingQueue,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'BirthdayGreeterHandler',
      Runtime: 'nodejs22.x',
    });
  });

  test('should configure SQS event source with batch size 10', () => {
    new BirthdayGreeterProcessor(stack, 'TestProcessor', {
      vpc,
      database,
      databaseSecret,
      greetingQueue,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
      BatchSize: 10,
    });
  });

  test('should configure SQS event source with 5 second batching window', () => {
    new BirthdayGreeterProcessor(stack, 'TestProcessor', {
      vpc,
      database,
      databaseSecret,
      greetingQueue,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
      MaximumBatchingWindowInSeconds: 5,
    });
  });

  test('should configure SQS event source with max concurrency 500', () => {
    new BirthdayGreeterProcessor(stack, 'TestProcessor', {
      vpc,
      database,
      databaseSecret,
      greetingQueue,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
      ScalingConfig: {
        MaximumConcurrency: 500,
      },
    });
  });

  test('should enable batch item failures reporting', () => {
    new BirthdayGreeterProcessor(stack, 'TestProcessor', {
      vpc,
      database,
      databaseSecret,
      greetingQueue,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
      FunctionResponseTypes: ['ReportBatchItemFailures'],
    });
  });

  test('should grant Lambda read access to database secret', () => {
    new BirthdayGreeterProcessor(stack, 'TestProcessor', {
      vpc,
      database,
      databaseSecret,
      greetingQueue,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith(['secretsmanager:GetSecretValue']),
          }),
        ]),
      },
    });
  });

  test('should create exactly 1 Lambda function', () => {
    new BirthdayGreeterProcessor(stack, 'TestProcessor', {
      vpc,
      database,
      databaseSecret,
      greetingQueue,
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::Lambda::Function', 1);
  });

  test('should create exactly 1 event source mapping', () => {
    new BirthdayGreeterProcessor(stack, 'TestProcessor', {
      vpc,
      database,
      databaseSecret,
      greetingQueue,
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::Lambda::EventSourceMapping', 1);
  });
});
