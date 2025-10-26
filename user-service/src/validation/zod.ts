import { z } from 'zod';

import { ianaTimeZoneSchema } from 'validation/IANATimeZone.js';

export const uuidSchema = z.string().uuid();

export const idParamSchema = z.object({ id: uuidSchema });

export const coercedDateSchema = z.coerce.date();

export const userCreateSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1).optional(),
  timeZone: ianaTimeZoneSchema,
  birthday: coercedDateSchema.optional(),
});

export type UUID = z.infer<typeof uuidSchema>;
export type IdParam = z.infer<typeof idParamSchema>;
export type UserCreateInput = z.infer<typeof userCreateSchema>;
