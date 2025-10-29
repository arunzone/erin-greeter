import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { IngestStack } from '../lib/ingest-stack';

describe('IngestStack User Ingestion Lambda', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new IngestStack(app, 'IngestStackUserIngestion');
    template = Template.fromStack(stack);
  });

  test('should be configured correctly', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs22.x',
      Handler: 'index.handler',
      MemorySize: 512,
      Timeout: 30,
      Environment: {
        Variables: Match.objectLike({
          LOG_LEVEL: 'INFO',
          DB_HOST: Match.anyValue(),
          DB_PORT: Match.anyValue(),
          DB_USERNAME: Match.anyValue(),
          DB_PASSWORD: Match.anyValue(),
          DB_NAME: 'postgres',
          SECRET_ARN: Match.anyValue(),
        }),
      },
    });
  });
});
