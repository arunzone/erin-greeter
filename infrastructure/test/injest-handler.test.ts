import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as IngestStack from '../lib/ingest-stack';

describe('User Ingestion Lambda', () => {
  describe('Main queue', () => {
    test('should have VisibilityTimeout of 30', () => {
      const app = new cdk.App();
      const stack = new IngestStack.IngestStack(app, 'UserConsumer');
      const template = Template.fromStack(stack);

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
});
