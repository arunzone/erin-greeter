import { BirthdayRepository, BirthdayUser } from '../repository/BirthdayRepository';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { DateTime } from 'luxon';

export interface GreetingMessage {
  userId: string;
  firstName: string;
  lastName: string;
  year: number;
}

export class BirthdayFinderService {
  constructor(
    private readonly repository: BirthdayRepository,
    private readonly sqsClient: SQSClient,
    private readonly queueUrl: string
  ) {}

  async findAndScheduleGreetings(): Promise<number> {
    const users = await this.repository.findUsersNeedingGreetingSoon();

    if (users.length === 0) {
      console.log('No users need birthday greetings at this time');
      return 0;
    }

    console.log(`Found ${users.length} users needing birthday greetings`);

    await this.sendGreetingsWithLoadBalancing(users);

    return users.length;
  }

  private async sendGreetingsWithLoadBalancing(users: BirthdayUser[]): Promise<void> {
    const totalUsers = users.length;
    const spreadWindowSeconds = 300;

    for (let i = 0; i < users.length; i++) {
      const user = users[i];

      const delaySeconds = this.calculateDelayWithStagger(user.timezone, i, totalUsers, spreadWindowSeconds);

      await this.sendToQueue(user, delaySeconds);
    }
  }

  private calculateDelayWithStagger(
    timezone: string,
    index: number,
    totalUsers: number,
    spreadWindowSeconds: number
  ): number {
    const userNow = DateTime.now().setZone(timezone);
    const target = userNow.set({ hour: 9, minute: 0, second: 0, millisecond: 0 });
    let delaySeconds = Math.floor(target.diff(userNow, 'seconds').seconds);

    const stagger = Math.floor((index / totalUsers) * spreadWindowSeconds);
    delaySeconds = Math.max(0, delaySeconds + stagger);

    return Math.min(900, delaySeconds);
  }

  private async sendToQueue(user: BirthdayUser, delaySeconds: number): Promise<void> {
    const message: GreetingMessage = {
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      year: DateTime.now().year,
    };

    await this.sqsClient.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(message),
        DelaySeconds: delaySeconds,
      })
    );

    console.log(`Scheduled greeting for ${user.firstName} ${user.lastName} with ${delaySeconds}s delay`);
  }
}
