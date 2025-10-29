import * as moment from 'moment';
import { UserMessage, UserData } from '../model';
import {
  User,
  NewUser,
  UpdateUser,
  NewUserBirthday,
  UpdateUserBirthday,
  UserBirthday,
  BirthdayRecord,
} from '../types';
import { UserRepository } from '../repository/UserRepository';
import { TransactionManager } from '../persistence/TransactionManager';
import { UserBirthdayRepository } from '../repository/UserBirthdayRepository';

export class UserService {
  constructor(
    private userRepository: UserRepository<User, NewUser, UpdateUser>,
    private userBirthdayRepository: UserBirthdayRepository<
      UserBirthday,
      NewUserBirthday,
      UpdateUserBirthday,
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
    if (message.eventType === 'created') {
      return await this.create(userData);
    }
    if (message.eventType === 'updated') {
      return await this.update(userData);
    }
    if (message.eventType === 'deleted') {
      return await this.delete(userData);
    }
  }
  async delete(
    userData: UserData
  ): Promise<{ user: User; userBirthday?: UserBirthday } | undefined> {
    const existingUser = await this.userRepository.findUserById(userData.id);
    if (existingUser) {
      await this.transactionManager.runInTransaction(async trx => {
        await this.userBirthdayRepository.deleteUserBirthday(userData.id, trx);
        await this.userRepository.deleteUser(userData.id, trx);
      });
      return undefined;
    } else {
      console.warn(`User ${userData.id} does not exist, skipping delete`);
      return undefined;
    }
  }
  async update(
    userData: UserData
  ): Promise<{ user: User; userBirthday?: UserBirthday } | undefined> {
    const existingUser = await this.userRepository.findUserById(userData.id);
    if (!existingUser) {
      console.warn(`User ${userData.id} does not exist, skipping update`);
      return undefined;
    }

    const birthdayData = this.getBirthdayData(userData);
    const existingBirthday = await this.userBirthdayRepository.findUserBirthdayByUserId(
      userData.id
    );

    const updatedUserData = await this.updateUserAndBirthday(
      userData,
      birthdayData,
      existingBirthday
    );

    console.log('User updated successfully:', {
      id: updatedUserData.user.id,
      name: `${updatedUserData.user.first_name} ${updatedUserData.user.last_name}`,
    });
    return updatedUserData;
  }
  async create(
    userData: UserData
  ): Promise<{ user: User; userBirthday?: UserBirthday } | undefined> {
    // Check if user already exists
    console.log('Checking if user exists:', JSON.stringify(userData));
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

  private async updateUserAndBirthday(
    userData: UserData,
    birthdayData: NewUserBirthday | undefined,
    existingBirthday: UserBirthday | undefined
  ) {
    return await this.transactionManager.runInTransaction(async trx => {
      const user = await this.updateUserBasicInfo(userData, trx);
      const userBirthday = await this.upsertUserBirthday(
        userData.id,
        birthdayData,
        existingBirthday,
        trx
      );
      return { user, userBirthday };
    });
  }

  private async updateUserBasicInfo(userData: UserData, trx: KyselyTrx): Promise<User> {
    const userUpdateData: UpdateUser = {
      first_name: userData.firstName,
      last_name: userData.lastName,
    };
    return await this.userRepository.updateUser(userData.id, userUpdateData, trx);
  }

  private async upsertUserBirthday(
    userId: string,
    birthdayData: NewUserBirthday | undefined,
    existingBirthday: UserBirthday | undefined,
    trx: KyselyTrx
  ): Promise<UserBirthday | undefined> {
    if (!birthdayData) {
      return undefined;
    }

    if (existingBirthday) {
      return await this.updateExistingBirthday(userId, birthdayData, trx);
    }

    return await this.userBirthdayRepository.createUserBirthday(birthdayData, trx);
  }

  private async updateExistingBirthday(
    userId: string,
    birthdayData: NewUserBirthday,
    trx: KyselyTrx
  ): Promise<UserBirthday> {
    const birthdayUpdate: UpdateUserBirthday = {
      day: birthdayData.day,
      month: birthdayData.month,
      year: birthdayData.year,
      timezone: birthdayData.timezone,
    };
    return await this.userBirthdayRepository.updateUserBirthday(userId, birthdayUpdate, trx);
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
