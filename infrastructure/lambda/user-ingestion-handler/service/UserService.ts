import * as moment from 'moment';
import { UserMessage } from '../model';
import { User } from '../types';
import { UserRepository } from '../repository/UserRepository';

export class UserService {
  constructor(private userRepository: UserRepository<User>) {}

  async processUserMessage(message: UserMessage): Promise<User | undefined> {
    console.log('Processing event:', message.eventType);
    console.log('User data:', JSON.stringify(message.user, null, 2));

    const userData = message.user;

    let birthdayDateString: string | undefined = undefined;
    if (userData.birthday) {
      birthdayDateString = moment.utc(userData.birthday).format('YYYY-MM-DD');
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findUserById(userData.id);

    if (existingUser) {
      console.log(`User ${userData.id} already exists, skipping insert`);
      return existingUser;
    }

    // Insert user into database
    const insertedUser = await this.userRepository.createUser({
      id: userData.id,
      first_name: userData.firstName,
      last_name: userData.lastName,
      birthday: birthdayDateString,
      timezone: userData.timeZone,
    });

    console.log('User inserted successfully:', {
      id: insertedUser.id,
      name: `${insertedUser.first_name} ${insertedUser.last_name}`,
      birthday: insertedUser.birthday,
      timezone: insertedUser.timezone,
      created_at: insertedUser.created_at,
    });

    return insertedUser;
  }

  async printAllUsers(): Promise<User[]> {
    const allUsers = await this.userRepository.findAllUsers();
    console.log(`Found ${allUsers.length} users in database:`);
    allUsers.forEach((user: User, index: number) => {
      console.log(`User ${index + 1}:`, {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        birthday: user.birthday,
        timezone: user.timezone,
        created_at: user.created_at,
      });
    });
    return allUsers;
  }

}
