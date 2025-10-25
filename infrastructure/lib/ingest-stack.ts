import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { VpcConstruct } from './constructs/VpcConstruct';
import { DatabaseConstruct } from './constructs/DatabaseConstruct';
import { QueuesConstruct } from './constructs/QueuesConstruct';
import { SecretConstruct } from './constructs/DatabaseSecret';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as sm from 'aws-cdk-lib/aws-secretsmanager';
import * as sqs from 'aws-cdk-lib/aws-sqs';

interface IngestStackProps extends cdk.StackProps {
  database: rds.DatabaseInstance
  databaseSecret: sm.Secret
  vpc: ec2.Vpc
  databaseName: string
}

export class IngestStack extends cdk.Stack {
  public readonly database: rds.DatabaseInstance
  public readonly databaseSecret: sm.Secret
  public readonly vpc: ec2.Vpc
  public readonly databaseName: string = 'postgres'
  public readonly queue: sqs.Queue

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new VpcConstruct(this, 'Vpc').vpc;

    const databaseSecret = new SecretConstruct(this, 'Secret', { username: 'postgres' }).instance;

    const database = new DatabaseConstruct(this, 'Database', { vpc: vpc, databaseName: this.databaseName, secret: databaseSecret }).instance;
    database.connections.allowInternally(ec2.Port.allTraffic())

    const queue = new QueuesConstruct(this, 'Queues').queue;

    this.database = database
    this.databaseSecret = databaseSecret
    this.vpc = vpc
    this.queue = queue
  }
}
