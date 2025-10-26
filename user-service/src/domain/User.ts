import { z } from 'zod';

import { ianaTimeZoneSchema } from 'validation/IANATimeZone.js';
import { uuidSchema } from 'validation/zod.js';

export class User {
  public id: string;
  public firstName: string;
  public lastName?: string;
  public timeZone: string;
  public createdAt: Date;
  public updatedAt: Date;
  public birthday?: Date;

  // Centralized domain validation schema
  public static readonly userPropsSchema = z.object({
    id: uuidSchema,
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1).optional(),
    timeZone: ianaTimeZoneSchema,
    createdAt: z.date(),
    updatedAt: z.date(),
    birthday: z.date().optional(),
  });

  // Inferred domain type
  public static readonly UserProps = {} as unknown as z.infer<typeof User.userPropsSchema>;

  constructor(
    id: string,
    firstName: string,
    lastName: string | undefined,
    timeZone: string,
    createdAt: Date,
    updatedAt: Date,
    birthday?: Date,
  ) {
    const props = User.userPropsSchema.parse({
      id,
      firstName,
      lastName: lastName && lastName.trim().length > 0 ? lastName : undefined,
      timeZone,
      createdAt,
      updatedAt,
      birthday: birthday ?? undefined,
    }) as z.infer<typeof User.userPropsSchema>;

    this.id = props.id;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.timeZone = props.timeZone;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.birthday = props.birthday;
  }
}
