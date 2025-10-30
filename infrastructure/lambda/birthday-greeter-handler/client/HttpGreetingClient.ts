import * as axios from 'axios';
import { GreetingClient } from './GreetingClient';
import { GreetingPayload } from '../types';

export class HttpGreetingClient implements GreetingClient {
  constructor(private requestBinUrl: string) {}

  async sendGreeting(payload: GreetingPayload): Promise<void> {
    await axios.post(this.requestBinUrl, payload);
  }
}
