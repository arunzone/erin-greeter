import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as sm from 'aws-cdk-lib/aws-secretsmanager';
import { Template } from 'aws-cdk-lib/assertions';
import { BirthdayGreetingStack } from '../../lib/birthday-greeting-stack';

describe('BirthdayGreetingStack', () => {
  let app: cdk.App;
  let vpc: ec2.Vpc;
  let database: rds.DatabaseInstance;
  let databaseSecret: sm.Secret;

  beforeEach(() => {
    app = new cdk.App();
    const setupStack = new cdk.Stack(app, 'SetupStack');
    vpc = new ec2.Vpc(setupStack, 'TestVpc');
    databaseSecret = new sm.Secret(setupStack, 'TestSecret');
    database = new rds.DatabaseInstance(setupStack, 'TestDatabase', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_16_6 }),
      vpc,
      credentials: rds.Credentials.fromSecret(databaseSecret),
    });
  });

  test('should create greeting queue', () => {
    const stack = new BirthdayGreetingStack(app, 'TestStack', {
      vpc,
      database,
      databaseSecret,
      databaseName: 'postgres',
    });

    expect(stack.greetingQueue).toBeDefined();
  });

  test('should create greeting DLQ', () => {
    const stack = new BirthdayGreetingStack(app, 'TestStack', {
      vpc,
      database,
      databaseSecret,
      databaseName: 'postgres',
    });

    expect(stack.greetingDLQ).toBeDefined();
  });

  test('should create birthday finder', () => {
    const stack = new BirthdayGreetingStack(app, 'TestStack', {
      vpc,
      database,
      databaseSecret,
      databaseName: 'postgres',
    });

    expect(stack.birthdayFinder).toBeDefined();
  });

  test('should create birthday greeter', () => {
    const stack = new BirthdayGreetingStack(app, 'TestStack', {
      vpc,
      database,
      databaseSecret,
      databaseName: 'postgres',
    });

    expect(stack.birthdayGreeter).toBeDefined();
  });

  test('should create 2 SQS queues', () => {
    const stack = new BirthdayGreetingStack(app, 'TestStack', {
      vpc,
      database,
      databaseSecret,
      databaseName: 'postgres',
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::SQS::Queue', 2);
  });

  test('should create 2 Lambda functions', () => {
    const stack = new BirthdayGreetingStack(app, 'TestStack', {
      vpc,
      database,
      databaseSecret,
      databaseName: 'postgres',
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::Lambda::Function', 2);
  });

  test('should create 1 EventBridge rule', () => {
    const stack = new BirthdayGreetingStack(app, 'TestStack', {
      vpc,
      database,
      databaseSecret,
      databaseName: 'postgres',
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::Events::Rule', 1);
  });

  test('should create 1 event source mapping', () => {
    const stack = new BirthdayGreetingStack(app, 'TestStack', {
      vpc,
      database,
      databaseSecret,
      databaseName: 'postgres',
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::Lambda::EventSourceMapping', 1);
  });
});
