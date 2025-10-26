import { SQSClient, SendMessageCommand, SendMessageCommandInput } from '@aws-sdk/client-sqs';
import { inject, injectable } from 'inversify';

import { AppConfig } from 'config/config.js';
import { TYPES } from 'di/types.js';
import { User } from 'domain/User.js';
import { UserEventType } from 'domain/UserEventType.js';
import { SqsService } from 'service/interface/SqsService.js';

@injectable()
export class AwsSqsService implements SqsService {
  constructor(
    @inject(TYPES.SQSClient)
    private sqsClient: SQSClient,
    @inject(TYPES.Config)
    private config: AppConfig,
  ) {}

  async sendUserEvent(user: User, eventType: UserEventType): Promise<void> {
    if (!this.config.aws.sqsQueueUrl) {
      console.warn('SQS_QUEUE_URL not configured, skipping SQS message');
      return;
    }

    try {
      const messageBody = JSON.stringify({
        eventType: eventType,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          timeZone: user.timeZone,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          birthday: user.birthday,
        },
        timestamp: new Date().toISOString(),
      });

      const command: SendMessageCommandInput = {
        QueueUrl: this.config.aws.sqsQueueUrl,
        MessageBody: messageBody,
      };

      const result = await this.sqsClient.send(new SendMessageCommand(command));

      console.log(`User ${eventType} event sent to SQS. MessageId: ${result.MessageId}`);
    } catch (error) {
      console.error(`Failed to send user ${eventType} event to SQS:`, error);
      throw new Error(
        `Failed to send SQS message: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
