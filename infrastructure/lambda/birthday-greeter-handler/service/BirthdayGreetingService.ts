import { GreetingMessage } from '../model';
import { BirthdayGreetingRepository } from '../repository/BirthdayGreetingRepository';
import { GreetingClient } from '../client/GreetingClient';
import { GreetingPayload } from '../types';

export class BirthdayGreetingService {
  constructor(
    private birthdayGreetingRepository: BirthdayGreetingRepository,
    private greetingClient: GreetingClient
  ) {}

  async processGreeting(message: GreetingMessage): Promise<void> {
    console.log(`Processing greeting for user ${message.userId}`);

    const wasUpdated = await this.birthdayGreetingRepository.updateSentYear(
      message.userId,
      message.year
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
  }

  private formatGreeting(firstName: string, lastName: string): string {
    return `Hey, ${firstName} ${lastName} it's your birthday!`;
  }
}
