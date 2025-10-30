import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as cdk from 'aws-cdk-lib';
import * as sm from 'aws-cdk-lib/aws-secretsmanager';

export interface DatabaseConstructProps {
  vpc: ec2.IVpc;
  instanceType?: ec2.InstanceType;
  databaseName?: string;
  secret: sm.Secret;
  isLocal?: boolean;
}

export class DatabaseConstruct extends Construct {
  public readonly instance: rds.DatabaseInstance;

  constructor(scope: Construct, id: string, props: DatabaseConstructProps) {
    super(scope, id);

    // Use PRIVATE_ISOLATED for LocalStack (no NAT gateway), PRIVATE_WITH_EGRESS for AWS
    const subnetType = props.isLocal ? ec2.SubnetType.PRIVATE_ISOLATED : ec2.SubnetType.PRIVATE_WITH_EGRESS;

    this.instance = new rds.DatabaseInstance(this, 'RdsInstance', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_14,
      }),
      instanceType:
        props.instanceType ?? ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc: props.vpc,
      vpcSubnets: {
        subnetType,
      },
      allocatedStorage: 5,
      storageType: rds.StorageType.STANDARD,
      multiAz: false,
      publiclyAccessible: false,
      credentials: rds.Credentials.fromSecret(props.secret),
      databaseName: props.databaseName ?? 'postgres',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
    });

    // Add ingress rule for PostgreSQL connections from anywhere (for LocalStack development)
    this.instance.connections.allowFrom(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5432),
      'Allow PostgreSQL connections'
    );
  }
}
