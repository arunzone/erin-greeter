import { z } from 'zod';

import { ianaTimeZoneSchema } from 'validation/IANATimeZone.js';

export const updateUserSchema = z.object({
  firstName: z.string(),
  lastName: z.string().optional(),
  timeZone: ianaTimeZoneSchema,
  birthday: z.coerce.date().optional(),
});

export type UpdateUserDto = z.infer<typeof updateUserSchema>;
