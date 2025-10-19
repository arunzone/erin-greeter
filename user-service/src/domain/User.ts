import { z } from 'zod';

import { uuidSchema } from '../validation/zod.js';

export class User {
  public id: string;
  public firstName: string;
  public lastName?: string;
  public timeZone: string;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(
    id: string,
    firstName: string,
    lastName: string | undefined,
    timeZone: string,
    createdAt: Date,
    updatedAt: Date,
  ) {
    const parsedId = uuidSchema.parse(id);
    const nameSchema = z.string().trim().min(1);
    const parsedFirst = nameSchema.parse(firstName);
    const parsedLast =
      lastName && lastName.trim().length > 0 ? nameSchema.parse(lastName) : undefined;
    const parsedCreated = z.date().parse(createdAt);
    const parsedUpdated = z.date().parse(updatedAt);
    const parsedTimezone = nameSchema.parse(timeZone);

    this.id = parsedId;
    this.firstName = parsedFirst;
    this.lastName = parsedLast;
    this.timeZone = parsedTimezone;
    this.createdAt = parsedCreated;
    this.updatedAt = parsedUpdated;
  }
}
