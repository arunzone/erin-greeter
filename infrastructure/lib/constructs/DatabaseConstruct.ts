import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as cdk from 'aws-cdk-lib';

export interface DatabaseConstructProps {
  vpc: ec2.IVpc;
  instanceType?: ec2.InstanceType;
  dbName?: string;
}

export class DatabaseConstruct extends Construct {
  public readonly instance: rds.DatabaseInstance;

  constructor(scope: Construct, id: string, props: DatabaseConstructProps) {
    super(scope, id);

    this.instance = new rds.DatabaseInstance(this, 'RdsInstance', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_14,
      }),
      instanceType: props.instanceType ?? ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc: props.vpc,
      allocatedStorage: 5,
      storageType: rds.StorageType.STANDARD,
      multiAz: false,
      publiclyAccessible: false,
      credentials: rds.Credentials.fromGeneratedSecret('postgres'),
      databaseName: props.dbName ?? 'greet',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
    });

  }
}
