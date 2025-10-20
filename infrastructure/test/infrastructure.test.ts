import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as IngestStack from '../lib/ingest-stack';

describe('SQS Queue Created', () => {
    describe('Main queue', () => {
        test('should have VisibilityTimeout of 30', () => {
            const app = new cdk.App();

            const stack = new IngestStack.IngestStack(app, 'IngestStack');
            
            const template = Template.fromStack(stack);

            template.hasResourceProperties('AWS::SQS::Queue', {
                VisibilityTimeout: 30
            });
        });

        test('should have DLQ with maxReceiveCount 3', () => {
            const app = new cdk.App();

            const stack = new IngestStack.IngestStack(app, 'IngestStackMax');

            const template = Template.fromStack(stack);

            template.hasResourceProperties('AWS::SQS::Queue', {
                RedrivePolicy: {
                    maxReceiveCount: 3,
                },
            });
        });

        test('should configure dead letter target ARN', () => {
            const app = new cdk.App();

            const stack = new IngestStack.IngestStack(app, 'IngestStackDlq');

            const template = Template.fromStack(stack);

            template.hasResourceProperties('AWS::SQS::Queue', {
                RedrivePolicy: {
                    deadLetterTargetArn: Match.anyValue(),
                },
            });
        });

        test('should name main queue ingestion-queue', () => {
            const app = new cdk.App();

            const stack = new IngestStack.IngestStack(app, 'IngestStackQueueName');

            const template = Template.fromStack(stack);

            template.hasResourceProperties('AWS::SQS::Queue', {
                QueueName: 'ingestion-queue',
            });
        });
    });

    describe('DLQ', () => {
        test('should name DLQ ingestion-dlq', () => {
            const app = new cdk.App();

            const stack = new IngestStack.IngestStack(app, 'IngestStackDlqName');

            const template = Template.fromStack(stack);

            template.hasResourceProperties('AWS::SQS::Queue', {
                QueueName: 'ingestion-dlq',
            });
        });
        
        test('DLQ should have 2 days retention', () => {
            const app = new cdk.App();

            const stack = new IngestStack.IngestStack(app, 'IngestStackDlqRetention');

            const template = Template.fromStack(stack);

            template.hasResourceProperties('AWS::SQS::Queue', {
                MessageRetentionPeriod: 172800,
                RedrivePolicy: Match.absent(),
            });
        });

    });
});
