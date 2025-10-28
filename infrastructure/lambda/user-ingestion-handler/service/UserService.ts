import * as moment from 'moment';
import { UserMessage, UserData } from '../model';
import { User, NewUser, NewUserBirthday, UserBirthday, BirthdayRecord } from '../types';
import { UserRepository } from '../repository/UserRepository';
import { TransactionManager } from '../persistence/TransactionManager';
import { UserBirthdayRepository } from '../repository/UserBirthdayRepository';

export class UserService {
  constructor(
    private userRepository: UserRepository<User, NewUser>,
    private userBirthdayRepository: UserBirthdayRepository<
      UserBirthday,
      NewUserBirthday,
      BirthdayRecord
    >,
    private transactionManager: TransactionManager
  ) {}

  async processUserMessage(
    message: UserMessage
  ): Promise<{ user: User; userBirthday?: UserBirthday } | undefined> {
    console.log('Processing event:', message.eventType);
    console.log('User data:', JSON.stringify(message.user, null, 2));

    const userData = message.user;

    // Check if user already exists
    const existingUser = await this.userRepository.findUserById(userData.id);
    if (existingUser) {
      console.log(`User ${userData.id} already exists, skipping insert`);
      return { user: existingUser };
    }

    const birthdayInsertData: NewUserBirthday | undefined = this.getBirthdayData(userData);
    const insertedUser = await this.createUserAndBirthday(userData, birthdayInsertData);

    console.log('User inserted successfully:', {
      id: insertedUser.user.id,
      name: `${insertedUser.user.first_name} ${insertedUser.user.last_name}`,
      created_at: insertedUser.user.created_at,
    });

    return insertedUser;
  }
  private async createUserAndBirthday(
    userData: UserData,
    birthdayInsertData: NewUserBirthday | undefined
  ) {
    return await this.transactionManager.runInTransaction(async trx => {
      const userInsertData = {
        id: userData.id,
        first_name: userData.firstName,
        last_name: userData.lastName,
      };

      const user = await this.userRepository.createUser(userInsertData, trx);
      let userBirthday = undefined;
      if (birthdayInsertData) {
        userBirthday = await this.userBirthdayRepository.createUserBirthday(
          birthdayInsertData,
          trx
        );
      }
      return { user, userBirthday };
    });
  }

  private getBirthdayData(userData: UserData) {
    let birthdayInsertData: NewUserBirthday | undefined;
    if (userData.birthday) {
      const birthdayUtc = moment.utc(userData.birthday);
      const birthdayDay = birthdayUtc.date();
      const birthdayMonth = birthdayUtc.month() + 1;
      const birthdayYear = birthdayUtc.year();
      birthdayInsertData = {
        user_id: userData.id,
        day: birthdayDay,
        month: birthdayMonth,
        year: birthdayYear,
        timezone: userData.timeZone,
      };
    }
    return birthdayInsertData;
  }

  async printAllUsers(): Promise<User[]> {
    const allUsers = await this.userRepository.findAllUsers();
    console.log(`Found ${allUsers.length} users in database:`);
    allUsers.forEach((user: User, index: number) => {
      console.log(`User ${index + 1}:`, {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        created_at: user.created_at,
      });
    });
    return allUsers;
  }
}
