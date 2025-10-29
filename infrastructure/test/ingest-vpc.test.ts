import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { IngestStack } from '../lib/ingest-stack';

describe('IngestStack VPC', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new IngestStack(app, 'IngestStackVpc');
    template = Template.fromStack(stack);
  });

  test('should create a VPC with 4 subnets and no NAT Gateways', () => {
    template.resourceCountIs('AWS::EC2::VPC', 1);
    template.resourceCountIs('AWS::EC2::Subnet', 4);
    template.resourceCountIs('AWS::EC2::NatGateway', 0);
  });
});
