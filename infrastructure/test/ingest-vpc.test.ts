import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { IngestStack } from '../lib/ingest-stack';

describe('Ingest VPC', () => {
  test('should create a VPC', () => {
    const app = new cdk.App();
    const stack = new IngestStack(app, 'IngestStackVpc');
    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::EC2::VPC', 1);
  });

  test('should create 2 subnets (public + private in 2 AZ)', () => {
    const app = new cdk.App();
    const stack = new IngestStack(app, 'IngestStackSubnets');
    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::EC2::Subnet', 4);
  });

  test('should create 1 NAT Gateway (lower cost)', () => {
    const app = new cdk.App();
    const stack = new IngestStack(app, 'IngestStackNat');
    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::EC2::NatGateway', 0);
  });
});

