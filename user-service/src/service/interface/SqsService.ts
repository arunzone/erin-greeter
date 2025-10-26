import { User } from '../../domain/User.js';
import { UserEventType } from '../../domain/UserEventType.js';

export interface SqsService {
  sendUserEvent(user: User, eventType: UserEventType): Promise<void>;
}
