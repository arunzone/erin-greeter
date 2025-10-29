import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { IngestStack } from '../lib/ingest-stack';

describe('IngestStack Database', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new IngestStack(app, 'IngestStackDb');
    template = Template.fromStack(stack);
  });

  test('should create one PostgreSQL instance', () => {
    template.resourceCountIs('AWS::RDS::DBInstance', 1);
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      Engine: 'postgres',
      DBName: 'postgres',
      PubliclyAccessible: false,
      DeletionProtection: false,
    });
  });

  test('should use db.t3.micro instance class', () => {
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      DBInstanceClass: 'db.t3.micro',
    });
  });

  test('should allocate 5 GiB of standard storage', () => {
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      AllocatedStorage: '5',
      StorageType: 'standard',
    });
  });

  test('should have Delete removal policies for DBInstance', () => {
    template.hasResource('AWS::RDS::DBInstance', {
      DeletionPolicy: 'Delete',
      UpdateReplacePolicy: 'Delete',
    });
  });

  test('should have Delete removal policies for the generated Secret', () => {
    template.hasResource('AWS::SecretsManager::Secret', {
      DeletionPolicy: 'Delete',
      UpdateReplacePolicy: 'Delete',
    });
  });
});
