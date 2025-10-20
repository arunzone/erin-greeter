import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { IngestStack } from '../lib/ingest-stack';

describe('Database (RDS)', () => {
  test('should create one PostgreSQL instance for database greet', () => {
    const app = new cdk.App();
    const stack = new IngestStack(app, 'IngestStackDb');
    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::RDS::DBInstance', 1);

    template.hasResourceProperties('AWS::RDS::DBInstance', {
      Engine: 'postgres',
      DBName: 'greet',
      PubliclyAccessible: false,
      DeletionProtection: false,
    });
  });

  test('should use instance class with ~1 GiB memory (db.t3.micro)', () => {
    const app = new cdk.App();
    const stack = new IngestStack(app, 'IngestStackDbClass');
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::RDS::DBInstance', {
      DBInstanceClass: 'db.t3.micro',
    });
  });

  test('should allocate 5 GiB storage', () => {
    const app = new cdk.App();
    const stack = new IngestStack(app, 'IngestStackDbStorage');
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::RDS::DBInstance', {
      AllocatedStorage: '5',
      StorageType: 'standard',
    });
  });

  test('DBInstance removal policies should be Delete on replace and destroy', () => {
    const app = new cdk.App();
    const stack = new IngestStack(app, 'IngestStackDbRemoval');
    const template = Template.fromStack(stack);

    template.hasResource('AWS::RDS::DBInstance', {
      DeletionPolicy: 'Delete',
      UpdateReplacePolicy: 'Delete',
    });
  });

  test('Generated Secret removal policies should be Delete on replace and destroy', () => {
    const app = new cdk.App();
    const stack = new IngestStack(app, 'IngestStackSecretRemoval');
    const template = Template.fromStack(stack);

    template.hasResource('AWS::SecretsManager::Secret', {
      DeletionPolicy: 'Delete',
      UpdateReplacePolicy: 'Delete',
    });
  });
});
