export interface UserMessageData {
  id: string;
  firstName: string;
  lastName: string;
  timeZone: string;
  birthday: string;
}

export interface UserMessage {
  eventType: 'created' | 'updated' | 'deleted';
  user: {
    id: string;
    firstName: string;
    lastName: string;
    timeZone: string;
    birthday: string;
    createdAt: string;
    updatedAt: string;
  };
  timestamp: string;
}

const createBaseUserMessage = (
  eventType: 'created' | 'updated' | 'deleted',
  userId: string,
  firstName: string,
  lastName: string,
  timeZone: string = 'America/New_York',
  birthday: string = '1990-01-15T00:00:00.000Z'
): UserMessage => ({
  eventType,
  user: {
    id: userId,
    firstName,
    lastName,
    timeZone,
    birthday,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  timestamp: new Date().toISOString(),
});

export const createUserMessage = (
  userId: string,
  firstName: string,
  lastName: string,
  timeZone: string = 'America/New_York',
  birthday: string = '1990-01-15T00:00:00.000Z'
): UserMessage => createBaseUserMessage('created', userId, firstName, lastName, timeZone, birthday);

export const createUpdateUserMessage = (
  userId: string,
  firstName: string,
  lastName: string,
  timeZone: string = 'America/New_York',
  birthday: string = '1990-01-15T00:00:00.000Z'
): UserMessage => createBaseUserMessage('updated', userId, firstName, lastName, timeZone, birthday);

export const createDeleteUserMessage = (
  userId: string,
  firstName: string,
  lastName: string,
  timeZone: string = 'America/New_York',
  birthday: string = '1990-01-15T00:00:00.000Z'
): UserMessage => createBaseUserMessage('deleted', userId, firstName, lastName, timeZone, birthday);

export const createBatchUserMessages = (users: UserMessageData[]): UserMessage[] => {
  return users.map(user =>
    createUserMessage(user.id, user.firstName, user.lastName, user.timeZone, user.birthday)
  );
};
