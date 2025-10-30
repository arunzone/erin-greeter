import { GreetingMessage } from '../model';
import { BirthdayGreetingRepository } from '../repository/BirthdayGreetingRepository';
import { GreetingClient } from '../client/GreetingClient';
import { GreetingPayload } from '../types';
import { TransactionManager } from '../persistence/TransactionManager';

export class BirthdayGreetingService {
  constructor(
    private birthdayGreetingRepository: BirthdayGreetingRepository,
    private greetingClient: GreetingClient,
    private transactionManager: TransactionManager
  ) {}

  async processGreeting(message: GreetingMessage): Promise<void> {
    console.log(`Processing greeting for user ${message.userId}`);

    try {
      await this.transactionManager.runInTransaction(async (trx) => {
        const wasUpdated = await this.birthdayGreetingRepository.updateSentYear(
          message.userId,
          message.year,
          trx
        );

        if (!wasUpdated) {
          console.log(`User ${message.userId} already greeted this year, skipping`);
          return;
        }

        const greetingText = this.formatGreeting(message.firstName, message.lastName);
        const payload: GreetingPayload = {
          message: greetingText,
          userId: message.userId,
          timestamp: new Date().toISOString(),
        };

        await this.greetingClient.sendGreeting(payload);

        console.log(`Sent birthday greeting to ${message.firstName} ${message.lastName}`);
      });
    } catch (error) {
      console.error(`Failed to process greeting for user ${message.userId}:`, error);
      throw error;
    }
  }

  private formatGreeting(firstName: string, lastName: string): string {
    return `Hey, ${firstName} ${lastName} it's your birthday!`;
  }
}
