import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as sm from 'aws-cdk-lib/aws-secretsmanager';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { BirthdayFinderProcessor } from '../../../lib/constructs/BirthdayFinderProcessor';

describe('BirthdayFinderProcessor', () => {
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
    const processor = new BirthdayFinderProcessor(stack, 'TestProcessor', {
      vpc,
      database,
      databaseSecret,
      greetingQueue,
    });

    expect(processor.fn).toBeDefined();
  });

  test('should configure Lambda with 2 minute timeout', () => {
    new BirthdayFinderProcessor(stack, 'TestProcessor', {
      vpc,
      database,
      databaseSecret,
      greetingQueue,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'BirthdayFinderHandler',
      Timeout: 120,
    });
  });

  test('should configure Lambda with 512MB memory', () => {
    new BirthdayFinderProcessor(stack, 'TestProcessor', {
      vpc,
      database,
      databaseSecret,
      greetingQueue,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'BirthdayFinderHandler',
      MemorySize: 512,
    });
  });

  test('should configure Lambda with Node 22 runtime', () => {
    new BirthdayFinderProcessor(stack, 'TestProcessor', {
      vpc,
      database,
      databaseSecret,
      greetingQueue,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'BirthdayFinderHandler',
      Runtime: 'nodejs22.x',
    });
  });

  test('should create EventBridge rule with 15 minute schedule', () => {
    new BirthdayFinderProcessor(stack, 'TestProcessor', {
      vpc,
      database,
      databaseSecret,
      greetingQueue,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Events::Rule', {
      ScheduleExpression: 'rate(15 minutes)',
    });
  });

  test('should grant Lambda send message permissions to queue', () => {
    new BirthdayFinderProcessor(stack, 'TestProcessor', {
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
            Action: Match.arrayWith(['sqs:SendMessage']),
          }),
        ]),
      },
    });
  });

  test('should grant Lambda read access to database secret', () => {
    new BirthdayFinderProcessor(stack, 'TestProcessor', {
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
    new BirthdayFinderProcessor(stack, 'TestProcessor', {
      vpc,
      database,
      databaseSecret,
      greetingQueue,
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::Lambda::Function', 1);
  });

  test('should create exactly 1 EventBridge rule', () => {
    new BirthdayFinderProcessor(stack, 'TestProcessor', {
      vpc,
      database,
      databaseSecret,
      greetingQueue,
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::Events::Rule', 1);
  });
});
