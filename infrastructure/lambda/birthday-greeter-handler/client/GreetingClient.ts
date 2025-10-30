import { GreetingPayload } from '../types';

export interface GreetingClient {
  sendGreeting(payload: GreetingPayload): Promise<void>;
}
